import React, { ReactElement } from 'react';
import { Tooltip } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

interface PermissionTooltipProps {
  requiredRole: 'admin' | 'readonly';
  children: ReactElement;
  message?: string;
}

/**
 * Tooltip component that explains permission requirements for disabled features
 * @param requiredRole - The role required to use the feature
 * @param children - The element to wrap with tooltip
 * @param message - Custom message to display in tooltip
 */
export const PermissionTooltip: React.FC<PermissionTooltipProps> = ({
  requiredRole,
  children,
  message,
}) => {
  const { state } = useAuth();
  const { user } = state;

  // Determine if user has permission
  const hasPermission = user && (user.role === 'admin' || requiredRole === 'readonly');

  if (hasPermission) {
    // User has permission, render children without tooltip
    return children;
  }

  // User doesn't have permission, add tooltip and disable the element
  const defaultMessage =
    requiredRole === 'admin'
      ? 'This action requires administrator privileges'
      : 'This action requires user access';

  const tooltipMessage = message ?? defaultMessage;

  // Create disabled version by wrapping in span and setting disabled on child
  const childWithDisabled = React.cloneElement(children, {
    disabled: true,
  });

  return (
    <Tooltip title={tooltipMessage} arrow placement="top">
      <span>{childWithDisabled}</span>
    </Tooltip>
  );
};
