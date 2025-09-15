// Protected route component with authentication checks and role-based access control
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'admin' | 'readonly';
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireRole,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication state is being determined
  if (state.isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated || !state.user) {
    return <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />;
  }

  // Check role-based access if requireRole is specified
  if (requireRole && !hasRequiredRole(state.user, requireRole)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        padding={3}
        textAlign="center"
      >
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You do not have permission to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Required role: {requireRole} | Your role: {state.user.role}
        </Typography>
      </Box>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * Check if user has the required role for accessing a resource
 * Admin role has access to all resources, readonly has limited access
 */
function hasRequiredRole(user: User, requiredRole: 'admin' | 'readonly'): boolean {
  if (user.role === 'admin') {
    // Admin users have access to everything
    return true;
  }

  if (user.role === 'readonly' && requiredRole === 'readonly') {
    // Readonly users can access readonly resources
    return true;
  }

  // All other combinations are denied
  return false;
}
