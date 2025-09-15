// Tests for AuthContext and useAuth hook
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../../../src/store/AuthContext';
import { authService } from '../../../src/services/auth';
import type { User } from '../../../src/types/auth';

// Mock the auth service
jest.mock('../../../src/services/auth');
const mockAuthService = authService as jest.Mocked<typeof authService>;

const mockUser: User = {
  userId: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  firstName: 'John',
  lastName: 'Doe',
  lastLogin: '2023-01-01T00:00:00Z',
  createdAt: '2023-01-01T00:00:00Z',
};

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial auth state', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('should initialize with authenticated user if tokens exist', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getAccessToken.mockReturnValue('mock-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      expect(result.current.state.user).toEqual(mockUser);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('login function', () => {
    it('should successfully login user', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.state).toEqual({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(credentials);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Invalid credentials',
      });
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockAuthService.login.mockReturnValue(loginPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      act(() => {
        result.current.login(credentials);
      });

      // Check loading state
      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.error).toBeNull();

      // Resolve the login
      act(() => {
        resolveLogin!({
          user: mockUser,
          tokens: {
            accessToken: 'token',
            idToken: 'token',
            refreshToken: 'token',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });
  });

  describe('logout function', () => {
    it('should successfully logout user', async () => {
      // Start with authenticated state
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getAccessToken.mockReturnValue('mock-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      mockAuthService.logout.mockResolvedValue();

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should logout even if service logout fails', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('refreshToken function', () => {
    it('should successfully refresh tokens', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockTokens);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.state.user).toEqual(mockUser);
      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.error).toBeNull();
    });

    it('should handle refresh token failure', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.state).toEqual({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired. Please log in again.',
      });
    });
  });

  describe('clearError function', () => {
    it('should clear error state', async () => {
      // Start with an error
      mockAuthService.login.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });
});
