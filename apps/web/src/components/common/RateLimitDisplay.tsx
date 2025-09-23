import { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, AlertTitle, LinearProgress, Chip } from '@mui/material';
import { Schedule as ScheduleIcon, Refresh as RefreshIcon } from '@mui/icons-material';

export interface RateLimitDisplayProps {
  retryAfter: number; // seconds until retry allowed
  onRetry?: () => void;
  operation?: string;
  severity?: 'warning' | 'error' | 'info';
  showProgress?: boolean;
}

/**
 * Component to display rate limiting information with countdown timer
 */
export function RateLimitDisplay({
  retryAfter,
  onRetry,
  operation = 'operation',
  severity = 'warning',
  showProgress = true,
}: RateLimitDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState(retryAfter);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setCanRetry(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setCanRetry(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0s';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const progressValue = retryAfter > 0 ? ((retryAfter - timeRemaining) / retryAfter) * 100 : 100;

  return (
    <Alert
      severity={severity}
      sx={{ my: 2 }}
      action={
        canRetry && onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry} startIcon={<RefreshIcon />}>
            Retry Now
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>Rate Limit Exceeded</AlertTitle>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Too many requests for {operation}. Please wait before trying again.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 2,
            mb: showProgress ? 1 : 0,
          }}
        >
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {canRetry ? (
              'You can retry now'
            ) : (
              <>
                Retry in{' '}
                <Chip
                  label={formatTime(timeRemaining)}
                  size="small"
                  color={severity}
                  variant="outlined"
                />
              </>
            )}
          </Typography>
        </Box>

        {showProgress && !canRetry && (
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              },
            }}
          />
        )}
      </Box>
    </Alert>
  );
}

export interface RateLimitToastProps {
  retryAfter: number;
  operation?: string;
  onRetry?: () => void;
}

/**
 * Simplified rate limit component for toast notifications
 */
export function RateLimitToast({ retryAfter, operation = 'this operation' }: RateLimitToastProps) {
  const [timeRemaining, setTimeRemaining] = useState(retryAfter);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0s';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <Box>
      <Typography variant="body2">Rate limit exceeded for {operation}</Typography>
      <Typography variant="caption" color="text.secondary">
        {timeRemaining > 0 ? `Retry in ${formatTime(timeRemaining)}` : 'You can retry now'}
      </Typography>
    </Box>
  );
}

export default RateLimitDisplay;
