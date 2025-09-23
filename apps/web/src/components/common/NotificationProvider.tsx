// Enhanced notification provider for toast messages and alerts
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Snackbar, Alert, AlertColor, useTheme, useMediaQuery } from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  timestamp: number;
  persist?: boolean;
}

interface NotificationContextValue {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Maximum number of notifications to show simultaneously
  const MAX_NOTIFICATIONS = 5;

  const showNotification = useCallback(
    (message: string, severity: AlertColor = 'info', duration: number = 6000) => {
      const id = Date.now().toString();
      const notification: Notification = {
        id,
        message,
        severity,
        duration,
        timestamp: Date.now(),
        persist: duration === 0,
      };

      setNotifications((prev) => {
        // Remove oldest notification if we're at the limit
        const current = prev.length >= MAX_NOTIFICATIONS ? prev.slice(1) : prev;
        return [...current, notification];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    []
  );

  // Setup error handler integration
  useEffect(() => {
    // Import error handler and set notification provider
    void import('../../services/errorHandler').then(({ errorHandler }) => {
      errorHandler.setNotificationProvider((message, severity) => {
        showNotification(message, severity);
      });
    });
  }, [showNotification]);

  const showSuccess = (message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  };

  const showError = (message: string, duration?: number) => {
    showNotification(message, 'error', duration ?? 8000); // Errors show longer by default
  };

  const showWarning = (message: string, duration?: number) => {
    showNotification(message, 'warning', duration);
  };

  const showInfo = (message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const handleClose = (id: string) => () => {
    removeNotification(id);
  };

  const contextValue: NotificationContextValue = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open
          onClose={handleClose(notification.id)}
          anchorOrigin={{
            vertical: isMobile ? 'bottom' : 'top',
            horizontal: isMobile ? 'center' : 'right',
          }}
          sx={{
            mt: isMobile ? 0 : 8, // Offset for AppBar on desktop
            mb: isMobile ? 2 : 0,
            // Stack notifications vertically
            ...(isMobile
              ? {
                  bottom: `${16 + index * 80}px !important`,
                  top: 'auto !important',
                }
              : {
                  top: `${64 + 16 + index * 80}px !important`,
                  bottom: 'auto !important',
                }),
          }}
        >
          <Alert
            onClose={handleClose(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: '100%',
              minWidth: isMobile ? 280 : 400,
              maxWidth: isMobile ? 320 : 500,
              // Enhanced styling for different severities
              ...(notification.severity === 'error' && {
                backgroundColor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
              }),
              ...(notification.severity === 'success' && {
                backgroundColor: theme.palette.success.main,
                color: theme.palette.success.contrastText,
              }),
              ...(notification.severity === 'warning' && {
                backgroundColor: theme.palette.warning.main,
                color: theme.palette.warning.contrastText,
              }),
              ...(notification.severity === 'info' && {
                backgroundColor: theme.palette.info.main,
                color: theme.palette.info.contrastText,
              }),
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
