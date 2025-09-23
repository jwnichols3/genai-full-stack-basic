// Error handler service for centralized error management

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  correlationId?: string;
}

export interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  logToCloudWatch?: boolean;
  redirect?: boolean;
}

// Error message mappings for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  USER_NOT_CONFIRMED: 'Please verify your email address before signing in.',
  TOO_MANY_REQUESTS: 'Too many login attempts. Please try again in a few minutes.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  INSUFFICIENT_PRIVILEGES: 'You do not have permission to perform this action.',

  // Network errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request timed out. Please try again.',
  CONNECTION_REFUSED: 'Unable to connect to the server. Please try again later.',

  // API errors
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
  SERVER_ERROR: 'An internal server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',

  // Generic fallback
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

class ErrorHandler {
  private notificationProvider:
    | ((message: string, severity: 'error' | 'warning' | 'info' | 'success') => void)
    | null = null;
  private retryCallbacks: Map<string, () => Promise<void>> = new Map();
  private currentUser: { role?: string; email?: string } | null = null;

  setNotificationProvider(
    provider: (message: string, severity: 'error' | 'warning' | 'info' | 'success') => void
  ) {
    this.notificationProvider = provider;
  }

  setCurrentUser(user: { role?: string; email?: string } | null) {
    this.currentUser = user;
  }

  /**
   * Handle API response errors with status codes
   */
  async handleApiError(
    error: Response | Error,
    config: ErrorHandlerConfig = {}
  ): Promise<ApiError> {
    let apiError: ApiError;

    if (error instanceof Response) {
      // Handle HTTP Response errors
      apiError = await this.handleHttpResponse(error);
    } else if (error instanceof Error) {
      // Handle JavaScript errors
      apiError = this.handleJavaScriptError(error);
    } else {
      // Handle unknown errors
      apiError = this.handleUnknownError(error);
    }

    // Apply error handling based on configuration
    await this.processError(apiError, config);

    return apiError;
  }

  /**
   * Handle HTTP Response errors
   */
  private async handleHttpResponse(response: Response): Promise<ApiError> {
    const correlationId = response.headers.get('x-correlation-id') ?? this.generateCorrelationId();

    let errorData: Record<string, unknown> = {};
    try {
      const text = await response.text();
      if (text) {
        errorData = JSON.parse(text) as Record<string, unknown>;
      }
    } catch {
      // Ignore JSON parse errors
    }

    const apiError: ApiError = {
      code: this.mapStatusToErrorCode(response.status),
      message: this.getUserFriendlyMessage(response.status, errorData),
      status: response.status,
      details: errorData,
      correlationId,
    };

    return apiError;
  }

  /**
   * Handle JavaScript errors
   */
  private handleJavaScriptError(error: Error): ApiError {
    return {
      code: 'JAVASCRIPT_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR ?? 'An unexpected error occurred',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack ?? undefined,
      },
      correlationId: this.generateCorrelationId(),
    };
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: unknown): ApiError {
    return {
      code: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR ?? 'An unexpected error occurred',
      details: { originalError: error },
      correlationId: this.generateCorrelationId(),
    };
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'TOKEN_EXPIRED';
      case 403:
        return 'INSUFFICIENT_PRIVILEGES';
      case 404:
        return 'RESOURCE_NOT_FOUND';
      case 408:
        return 'TIMEOUT_ERROR';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
        return 'SERVER_ERROR';
      case 502:
      case 503:
      case 504:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(status: number, errorData: Record<string, unknown>): string {
    // Try to get message from error data first
    if (errorData?.message && typeof errorData.message === 'string') {
      return errorData.message;
    }

    // Handle authorization errors with role context
    if (status === 403) {
      return this.getAuthorizationErrorMessage(errorData);
    }

    // Fall back to status code mapping
    const errorCode = this.mapStatusToErrorCode(status);
    return (
      ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.UNKNOWN_ERROR ?? 'An unexpected error occurred'
    );
  }

  /**
   * Get authorization error message with role context
   */
  private getAuthorizationErrorMessage(errorData: Record<string, unknown>): string {
    const currentRole = this.currentUser?.role;
    const requiredRole =
      typeof errorData?.requiredRole === 'string' ? errorData.requiredRole : undefined;

    if (currentRole && requiredRole) {
      return `Access denied. Your role (${currentRole}) does not have sufficient permissions. Required role: ${requiredRole}. Contact your administrator for access.`;
    }

    if (currentRole) {
      return `Access denied. Your current role (${currentRole}) does not have sufficient permissions for this action. Contact your administrator for access.`;
    }

    return ERROR_MESSAGES.INSUFFICIENT_PRIVILEGES ?? 'Access denied';
  }

  /**
   * Process error based on configuration
   */
  private async processError(apiError: ApiError, config: ErrorHandlerConfig): Promise<void> {
    // Log to console if enabled
    if (config.logToConsole !== false) {
      console.error('API Error:', apiError);
    }

    // Log to CloudWatch if enabled
    if (config.logToCloudWatch) {
      await this.logToCloudWatch(apiError);
    }

    // Show toast notification if enabled
    if (config.showToast && this.notificationProvider) {
      const severity = this.getNotificationSeverity(apiError);
      this.notificationProvider(apiError.message, severity);
    }

    // Handle authentication redirects
    if (config.redirect !== false && this.shouldRedirectToLogin(apiError)) {
      await this.handleAuthenticationRedirect(apiError);
    }

    // Handle rate limiting
    if (apiError.code === 'RATE_LIMIT_EXCEEDED') {
      this.handleRateLimiting(apiError);
    }
  }

  /**
   * Get notification severity based on error
   */
  private getNotificationSeverity(apiError: ApiError): 'error' | 'warning' | 'info' | 'success' {
    switch (apiError.code) {
      case 'RATE_LIMIT_EXCEEDED':
      case 'TOO_MANY_REQUESTS':
        return 'warning';
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Check if error should trigger redirect to login
   */
  private shouldRedirectToLogin(apiError: ApiError): boolean {
    return apiError.code === 'TOKEN_EXPIRED' || apiError.status === 401;
  }

  /**
   * Handle authentication redirect with session message
   */
  private async handleAuthenticationRedirect(_apiError: ApiError): Promise<void> {
    // Store current URL for post-login redirect
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/login') {
      sessionStorage.setItem('redirectUrl', currentPath);
    }

    // Store session expired flag for login form
    sessionStorage.setItem('sessionExpired', 'true');

    // Clear auth tokens via auth service
    try {
      const { authService } = await import('./auth');
      await authService.logout();
    } catch (error) {
      console.warn('Failed to logout during error redirect:', error);
    }

    // Redirect to login
    window.location.href = '/login';
  }

  /**
   * Handle rate limiting with retry countdown
   */
  private handleRateLimiting(_apiError: ApiError): void {
    if (this.notificationProvider) {
      // Extract retry-after header if available
      const retryAfter =
        typeof _apiError.details?.retryAfter === 'number' ? _apiError.details.retryAfter : 60;

      this.notificationProvider(
        `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
        'warning'
      );

      // TODO: Implement retry countdown UI component
      // This would require a separate component to show countdown timer
    }
  }

  /**
   * Log error to CloudWatch
   */
  private async logToCloudWatch(apiError: ApiError): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'API_ERROR',
          details: {
            ...apiError,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
        }),
      });
    } catch (error) {
      console.warn('Failed to log error to CloudWatch:', error);
    }
  }

  /**
   * Generate correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register retry callback for automatic retries
   */
  registerRetryCallback(operation: string, callback: () => Promise<void>): void {
    this.retryCallbacks.set(operation, callback);
  }

  /**
   * Perform automatic retry with exponential backoff
   */
  async performRetry(operation: string, maxRetries: number = 3): Promise<void> {
    const callback = this.retryCallbacks.get(operation);
    if (!callback) {
      throw new Error(`No retry callback registered for operation: ${operation}`);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await callback();
        return; // Success
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }

        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Handle network connectivity errors
   */
  handleNetworkError(error: Error): ApiError {
    return {
      code: 'NETWORK_ERROR',
      message: ERROR_MESSAGES.NETWORK_ERROR ?? 'Network connection failed',
      details: {
        name: error.name,
        message: error.message,
        isOnline: navigator.onLine,
      },
      correlationId: this.generateCorrelationId(),
    };
  }

  /**
   * Handle authorization errors with role context
   */
  handleAuthorizationError(currentRole?: string, requiredRole?: string): ApiError {
    let message = ERROR_MESSAGES.INSUFFICIENT_PRIVILEGES ?? 'Access denied';

    if (currentRole && requiredRole) {
      message = `Access denied. Your role (${currentRole}) does not have sufficient permissions. Required role: ${requiredRole}.`;
    }

    return {
      code: 'INSUFFICIENT_PRIVILEGES',
      message,
      status: 403,
      details: {
        currentRole,
        requiredRole,
      },
      correlationId: this.generateCorrelationId(),
    };
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();
export default errorHandler;
