// Authentication-related TypeScript interfaces

export interface User {
  userId: string; // Cognito user ID (UUID)
  email: string; // User's email address (unique)
  role: 'admin' | 'readonly'; // User's permission level
  firstName: string; // User's first name
  lastName: string; // User's last name
  lastLogin?: string; // Last successful login time
  createdAt: string; // Account creation time
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
  name: string;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_START' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { tokens: AuthTokens } }
  | { type: 'REFRESH_TOKEN_FAILURE' }
  | { type: 'CLEAR_ERROR' };
