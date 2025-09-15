// Authentication state reducer using useReducer pattern
import type { AuthState, AuthAction } from '../types/auth';

export const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };

    case 'LOGOUT':
      return {
        ...initialAuthState,
      };

    case 'REFRESH_TOKEN_START':
      return {
        ...state,
        isLoading: true,
      };

    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null,
      };

    case 'REFRESH_TOKEN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired. Please log in again.',
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}
