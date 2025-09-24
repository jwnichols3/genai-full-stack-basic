import React, { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RoleGuardProps {
  requiredRole: 'admin' | 'readonly';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Role guard component that conditionally renders children based on user role
 * @param requiredRole - The role required to see the content
 * @param children - The content to render if user has required role
 * @param fallback - Optional fallback content if user doesn't have required role
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRole,
  children,
  fallback = null,
}) => {
  const { state } = useAuth();
  const { user } = state;

  // If no user or user role is lower than required, show fallback
  if (!user) {
    return <>{fallback}</>;
  }

  // Admin can see everything
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Readonly can only see readonly content
  if (requiredRole === 'readonly') {
    return <>{children}</>;
  }

  // User doesn't have required role
  return <>{fallback}</>;
};
