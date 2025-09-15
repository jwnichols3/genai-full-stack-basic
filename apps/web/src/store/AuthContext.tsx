// Authentication context provider using Context API and useReducer
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { authReducer, initialAuthState } from './authReducer';
import type { AuthState, LoginCredentials } from '../types/auth';

interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          // Try to get current user info if we have tokens
          const user = await authService.getCurrentUser();
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user,
              tokens: {
                accessToken: authService.getAccessToken() ?? '',
                idToken: '',
                refreshToken: '',
              },
            },
          });
        } catch (error) {
          // If getting user info fails, try to refresh token
          try {
            await refreshToken();
          } catch (refreshError) {
            // If refresh also fails, clear auth state
            dispatch({ type: 'LOGOUT' });
          }
        }
      }
    };

    void initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const { user, tokens } = await authService.login(credentials);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, tokens },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: errorMessage },
      });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout warning:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async (): Promise<void> => {
    dispatch({ type: 'REFRESH_TOKEN_START' });

    try {
      const tokens = await authService.refreshToken();
      const user = await authService.getCurrentUser();

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, tokens },
      });
      dispatch({ type: 'REFRESH_TOKEN_SUCCESS', payload: { tokens } });
    } catch (error) {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      throw error;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextValue = {
    state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
