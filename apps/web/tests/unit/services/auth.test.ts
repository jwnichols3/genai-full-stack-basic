// Tests for authentication service
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { authService } from '../../../src/services/auth';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider');

const mockCognitoClient = {
  send: jest.fn(),
};

const MockCognitoIdentityProviderClient = CognitoIdentityProviderClient as jest.MockedClass<
  typeof CognitoIdentityProviderClient
>;

beforeEach(() => {
  jest.clearAllMocks();
  MockCognitoIdentityProviderClient.mockImplementation(() => mockCognitoClient as any);

  // Clear sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
});

describe('AuthService', () => {
  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockAuthResult = {
        AccessToken: 'mock-access-token',
        IdToken: 'mock-id-token',
        RefreshToken: 'mock-refresh-token',
      };

      const mockUserAttributes = [
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'given_name', Value: 'John' },
        { Name: 'family_name', Value: 'Doe' },
        { Name: 'custom:role', Value: 'admin' },
      ];

      mockCognitoClient.send
        .mockResolvedValueOnce({
          AuthenticationResult: mockAuthResult,
        })
        .mockResolvedValueOnce({
          Username: 'test-user-id',
          UserAttributes: mockUserAttributes,
        });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authService.login(credentials);

      expect(result.user).toEqual({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe',
        lastLogin: expect.any(String),
        createdAt: expect.any(String),
      });

      expect(result.tokens).toEqual({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(mockCognitoClient.send).toHaveBeenCalledTimes(2);
      expect(mockCognitoClient.send).toHaveBeenCalledWith(expect.any(InitiateAuthCommand));
      expect(mockCognitoClient.send).toHaveBeenCalledWith(expect.any(GetUserCommand));
    });

    it('should handle invalid credentials error', async () => {
      const error = {
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password.',
      };

      mockCognitoClient.send.mockRejectedValueOnce(error);

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(authService.login(credentials)).rejects.toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        name: 'NotAuthorizedException',
      });
    });

    it('should handle too many requests error', async () => {
      const error = {
        name: 'TooManyRequestsException',
        message: 'Too many requests',
      };

      mockCognitoClient.send.mockRejectedValueOnce(error);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(authService.login(credentials)).rejects.toEqual({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later',
        name: 'TooManyRequestsException',
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Setup service with tokens
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem.mockReturnValue('mock-access-token');

      mockCognitoClient.send.mockResolvedValueOnce({});

      await authService.logout();

      expect(mockCognitoClient.send).toHaveBeenCalledWith(expect.any(GlobalSignOutCommand));
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('id_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should clear local tokens even if global signout fails', async () => {
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem.mockReturnValue('mock-access-token');

      mockCognitoClient.send.mockRejectedValueOnce(new Error('Network error'));

      await authService.logout();

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('id_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem.mockReturnValue('mock-refresh-token');

      const mockAuthResult = {
        AccessToken: 'new-access-token',
        IdToken: 'new-id-token',
      };

      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: mockAuthResult,
      });

      const tokens = await authService.refreshToken();

      expect(tokens).toEqual({
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('access_token', 'new-access-token');
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('id_token', 'new-id-token');
    });

    it('should throw error when no refresh token available', async () => {
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem.mockReturnValue(null);

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when tokens are available', () => {
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-id-token');

      // Create new service instance to trigger token initialization
      const newService = new (authService.constructor as any)();

      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should return false when tokens are not available', () => {
      const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>;
      sessionStorageMock.getItem.mockReturnValue(null);

      // Create new service instance to trigger token initialization
      const newService = new (authService.constructor as any)();

      expect(newService.isAuthenticated()).toBe(false);
    });
  });
});
