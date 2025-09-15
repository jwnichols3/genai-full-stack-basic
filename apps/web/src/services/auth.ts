// Authentication service using AWS Cognito SDK
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  GetUserCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../config/environment';
import type { LoginCredentials, AuthTokens, User, AuthError } from '../types/auth';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const ID_TOKEN_KEY = 'id_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private accessToken: string | null = null;
  private idToken: string | null = null;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: config.cognito.region,
    });

    // Initialize tokens from sessionStorage on service creation
    this.initializeTokensFromStorage();
  }

  /**
   * Initialize tokens from sessionStorage
   */
  private initializeTokensFromStorage(): void {
    try {
      this.accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      this.idToken = sessionStorage.getItem(ID_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to initialize tokens from storage:', error);
    }
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: config.cognito.clientId,
        AuthParameters: {
          USERNAME: credentials.email,
          PASSWORD: credentials.password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;

      if (!AccessToken || !IdToken || !RefreshToken) {
        throw new Error('Invalid authentication response');
      }

      const tokens: AuthTokens = {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
      };

      // Store tokens securely
      this.storeTokens(tokens);

      // Get user information
      const user = await this.getCurrentUser();

      return { user, tokens };
    } catch (error) {
      const authError = this.handleCognitoError(error);
      throw authError;
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      // Global sign out from Cognito if we have an access token
      if (this.accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: this.accessToken,
        });
        await this.cognitoClient.send(command);
      }
    } catch (error) {
      // Continue with local logout even if global signout fails
      console.warn('Failed to sign out from Cognito:', error);
    } finally {
      // Always clear local tokens
      this.clearTokens();
    }
  }

  /**
   * Get current user information from access token
   */
  async getCurrentUser(): Promise<User> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const command = new GetUserCommand({
        AccessToken: this.accessToken,
      });

      const response = await this.cognitoClient.send(command);

      if (!response.UserAttributes) {
        throw new Error('User attributes not found');
      }

      // Parse user attributes from Cognito response
      const attributes = response.UserAttributes.reduce(
        (acc, attr) => {
          if (attr.Name && attr.Value) {
            acc[attr.Name] = attr.Value;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      const user: User = {
        userId: response.Username ?? '',
        email: attributes['email'] ?? '',
        role: (attributes['custom:role'] as 'admin' | 'readonly') ?? 'readonly',
        firstName: attributes['given_name'] ?? '',
        lastName: attributes['family_name'] ?? '',
        lastLogin: new Date().toISOString(),
        createdAt: attributes['custom:created_at'] ?? new Date().toISOString(),
      };

      return user;
    } catch (error) {
      const authError = this.handleCognitoError(error);
      throw authError;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: config.cognito.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Token refresh failed');
      }

      const { AccessToken, IdToken } = response.AuthenticationResult;

      if (!AccessToken || !IdToken) {
        throw new Error('Invalid token refresh response');
      }

      const tokens: AuthTokens = {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken, // Keep the same refresh token
      };

      // Store updated tokens
      this.storeTokens(tokens);

      return tokens;
    } catch (error) {
      // Clear tokens if refresh fails
      this.clearTokens();
      const authError = this.handleCognitoError(error);
      throw authError;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.idToken);
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Store tokens securely
   */
  private storeTokens(tokens: AuthTokens): void {
    try {
      // Store access and id tokens in memory
      this.accessToken = tokens.accessToken;
      this.idToken = tokens.idToken;

      // Store refresh token in sessionStorage
      sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      sessionStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Clear all tokens from memory and storage
   */
  private clearTokens(): void {
    // Clear memory tokens
    this.accessToken = null;
    this.idToken = null;

    // Clear sessionStorage tokens
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ID_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to clear tokens from storage:', error);
    }
  }

  /**
   * Handle Cognito errors and convert to standardized format
   */
  private handleCognitoError(error: unknown): AuthError {
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message: string };

      switch (cognitoError.name) {
        case 'NotAuthorizedException':
          return {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            name: cognitoError.name,
          };
        case 'UserNotConfirmedException':
          return {
            code: 'USER_NOT_CONFIRMED',
            message: 'Please verify your email address',
            name: cognitoError.name,
          };
        case 'TooManyRequestsException':
          return {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts. Please try again later',
            name: cognitoError.name,
          };
        case 'NetworkError':
          return {
            code: 'NETWORK_ERROR',
            message: 'Network error. Please check your connection',
            name: cognitoError.name,
          };
        default:
          return {
            code: 'UNKNOWN_ERROR',
            message: cognitoError.message ?? 'An unexpected error occurred',
            name: cognitoError.name,
          };
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      name: 'UnknownError',
    };
  }
}

// Create and export singleton instance
export const authService = new AuthService();
export default authService;
