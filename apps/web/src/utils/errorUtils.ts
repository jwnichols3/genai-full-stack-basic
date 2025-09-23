import { ApiError } from '../services/errorHandler';

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'NetworkError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      !navigator.onLine
    );
  }
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'TimeoutError' ||
      error.message.includes('timeout') ||
      error.message.includes('timed out')
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: ApiError): boolean {
  if (isApiError(error)) {
    return (
      error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_CREDENTIALS' || error.status === 401
    );
  }
  return false;
}

/**
 * Check if error is an authorization error
 */
export function isAuthorizationError(error: ApiError): boolean {
  if (isApiError(error)) {
    return error.code === 'INSUFFICIENT_PRIVILEGES' || error.status === 403;
  }
  return false;
}

/**
 * Check if error is a rate limiting error
 */
export function isRateLimitError(error: ApiError): boolean {
  if (isApiError(error)) {
    return (
      error.code === 'RATE_LIMIT_EXCEEDED' ||
      error.code === 'TOO_MANY_REQUESTS' ||
      error.status === 429
    );
  }
  return false;
}

/**
 * Check if error is a server error
 */
export function isServerError(error: ApiError): boolean {
  if (isApiError(error)) {
    return error.status ? error.status >= 500 : false;
  }
  return false;
}

/**
 * Type guard to check if error is ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

/**
 * Extract retry-after value from error details
 */
export function getRetryAfter(error: ApiError): number {
  if (error.details?.retryAfter && typeof error.details.retryAfter === 'number') {
    return error.details.retryAfter;
  }

  // Default retry times based on error type
  if (isRateLimitError(error)) {
    return 60; // 1 minute for rate limits
  }

  if (isServerError(error)) {
    return 30; // 30 seconds for server errors
  }

  return 10; // 10 seconds default
}

/**
 * Get user-friendly title for error type
 */
export function getErrorTitle(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Connection Problem';
    case 'TOKEN_EXPIRED':
    case 'SESSION_EXPIRED':
      return 'Session Expired';
    case 'INSUFFICIENT_PRIVILEGES':
      return 'Access Denied';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too Many Requests';
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    case 'RESOURCE_NOT_FOUND':
      return 'Not Found';
    case 'SERVER_ERROR':
      return 'Server Error';
    case 'SERVICE_UNAVAILABLE':
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

/**
 * Get suggested action for error
 */
export function getSuggestedAction(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Check your internet connection and try again.';
    case 'TOKEN_EXPIRED':
    case 'SESSION_EXPIRED':
      return 'Please sign in again to continue.';
    case 'INSUFFICIENT_PRIVILEGES':
      return 'Contact your administrator for access.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Wait a moment before trying again.';
    case 'VALIDATION_ERROR':
      return 'Please check your input and try again.';
    case 'RESOURCE_NOT_FOUND':
      return "The item you're looking for may have been moved or deleted.";
    case 'SERVER_ERROR':
      return 'Please try again later or contact support if the problem persists.';
    case 'SERVICE_UNAVAILABLE':
      return 'The service is temporarily down. Please try again later.';
    default:
      return 'Please try again or contact support if the problem persists.';
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: ApiError): {
  title: string;
  message: string;
  action: string;
  severity: 'error' | 'warning' | 'info';
} {
  return {
    title: getErrorTitle(error),
    message: error.message,
    action: getSuggestedAction(error),
    severity: getSeverityFromError(error),
  };
}

/**
 * Get notification severity from error
 */
export function getSeverityFromError(error: ApiError): 'error' | 'warning' | 'info' {
  if (isRateLimitError(error)) {
    return 'warning';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR') {
    return 'info';
  }

  return 'error';
}

/**
 * Debounce error reporting to prevent spam
 */
class ErrorDebouncer {
  private errorCache = new Map<string, number>();
  private readonly DEBOUNCE_TIME = 5000; // 5 seconds

  shouldReport(error: ApiError): boolean {
    const key = `${error.code}-${error.message}`;
    const now = Date.now();
    const lastReported = this.errorCache.get(key);

    if (!lastReported || now - lastReported > this.DEBOUNCE_TIME) {
      this.errorCache.set(key, now);
      return true;
    }

    return false;
  }

  clear(): void {
    this.errorCache.clear();
  }
}

export const errorDebouncer = new ErrorDebouncer();
