import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullPage?: boolean;
  'aria-label'?: string;
}

/**
 * Standard loading spinner component with consistent styling
 */
export function LoadingSpinner({
  size = 'medium',
  message,
  fullPage = false,
  'aria-label': ariaLabel,
}: LoadingSpinnerProps) {
  const theme = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const content = (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2}>
      <CircularProgress
        size={getSize()}
        thickness={4}
        aria-label={ariaLabel ?? 'Loading'}
        sx={{
          color: theme.palette.primary.main,
        }}
      />
      {message && (
        <Typography variant="body2" color="text.secondary" textAlign="center" aria-live="polite">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        width="100%"
        padding={3}
      >
        {content}
      </Box>
    );
  }

  return content;
}

export interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  loadingText?: string;
}

/**
 * Loading state for buttons with spinner and optional text
 */
export function ButtonLoading({
  loading,
  children,
  size = 'small',
  loadingText,
}: ButtonLoadingProps) {
  if (!loading) {
    return <>{children}</>;
  }

  const spinnerSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <CircularProgress size={spinnerSize} color="inherit" aria-label="Loading" />
      <span>{loadingText ?? 'Loading...'}</span>
    </Box>
  );
}

export interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  height?: number;
}

/**
 * Skeleton loading placeholder for cards
 */
export function SkeletonCard({
  lines = 3,
  showAvatar = false,
  showActions = false,
  height,
}: SkeletonCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={2}>
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
            {Array.from({ length: lines }).map((_, index) => (
              <Skeleton
                key={index}
                variant="text"
                width={index === lines - 1 ? '40%' : '100%'}
                height={height ?? 20}
                sx={{ mb: 0.5 }}
              />
            ))}
          </Box>
        </Box>
        {showActions && (
          <Box display="flex" gap={1} mt={2}>
            <Skeleton variant="rectangular" width={80} height={32} />
            <Skeleton variant="rectangular" width={80} height={32} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton loading placeholder for tables
 */
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <Box>
      {/* Table header */}
      <Box display="flex" gap={2} mb={2} p={2}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Box key={colIndex} flex={1}>
            <Skeleton variant="text" width="80%" height={24} />
          </Box>
        ))}
      </Box>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} display="flex" gap={2} mb={1} p={2}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Box key={colIndex} flex={1}>
              <Skeleton variant="text" width={colIndex === 0 ? '60%' : '90%'} height={20} />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
  opacity?: number;
}

/**
 * Loading overlay that covers content during async operations
 */
export function LoadingOverlay({ loading, children, message, opacity = 0.7 }: LoadingOverlayProps) {
  return (
    <Box position="relative">
      {children}
      {loading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor={`rgba(255, 255, 255, ${opacity})`}
          zIndex={1000}
        >
          <LoadingSpinner size="large" message={message} />
        </Box>
      )}
    </Box>
  );
}

export interface LoadingTimeoutProps {
  loading: boolean;
  timeoutMs?: number;
  onTimeout?: () => void;
  children: React.ReactNode;
}

/**
 * Loading component with timeout handling
 */
export function LoadingTimeout({
  loading,
  timeoutMs = 30000, // 30 seconds default
  onTimeout,
  children,
}: LoadingTimeoutProps) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [loading, timeoutMs, onTimeout]);

  if (loading && timedOut) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="200px"
        gap={2}
      >
        <Typography variant="h6" color="warning.main">
          Operation Taking Longer Than Expected
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          The operation is taking longer than usual. Please check your connection or try again
          later.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
