import { useNotification } from '../components/common/NotificationProvider';

export interface ToastOptions {
  duration?: number;
  persist?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastHook {
  showToast: (message: string, severity?: 'success' | 'error' | 'warning' | 'info', options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
}

/**
 * Hook for displaying toast notifications
 *
 * @example
 * ```typescript
 * const toast = useToast();
 *
 * // Basic usage
 * toast.showSuccess('Operation completed successfully');
 * toast.showError('Failed to save changes');
 *
 * // With options
 * toast.showWarning('Connection unstable', {
 *   duration: 0, // Persist until manually dismissed
 *   action: {
 *     label: 'Retry',
 *     onClick: () => retryConnection()
 *   }
 * });
 * ```
 */
export function useToast(): ToastHook {
  const notification = useNotification();

  const showToast = (
    message: string,
    severity: 'success' | 'error' | 'warning' | 'info' = 'info',
    options?: ToastOptions
  ) => {
    const duration = options?.persist ? 0 : options?.duration;
    notification.showNotification(message, severity, duration);
  };

  const showSuccess = (message: string, options?: ToastOptions) => {
    const duration = options?.persist ? 0 : options?.duration ?? 5000;
    notification.showSuccess(message, duration);
  };

  const showError = (message: string, options?: ToastOptions) => {
    const duration = options?.persist ? 0 : options?.duration ?? 8000; // Errors show longer
    notification.showError(message, duration);
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    const duration = options?.persist ? 0 : options?.duration ?? 6000;
    notification.showWarning(message, duration);
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    const duration = options?.persist ? 0 : options?.duration ?? 5000;
    notification.showInfo(message, duration);
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}