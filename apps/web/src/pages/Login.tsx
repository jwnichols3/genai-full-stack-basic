// Login page component that integrates LoginForm with authentication
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import type { LoginCredentials } from '../types/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, login, clearError } = useAuth();

  // Get the intended destination from location state, default to dashboard
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [state.isAuthenticated, navigate, from]);

  // Clear any existing errors when component mounts
  useEffect(() => {
    if (state.error) {
      clearError();
    }
  }, [clearError, state.error]);

  const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
    await login(credentials);
    // Navigation is handled by the useEffect above
    // Error is already handled by the auth context
  };

  return <LoginForm onSubmit={handleLogin} loading={state.isLoading} error={state.error} />;
}

export default Login;
