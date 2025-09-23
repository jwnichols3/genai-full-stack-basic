import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log error to CloudWatch via API
    void this.logErrorToCloudWatch(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logErrorToCloudWatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorDetails: ErrorDetails = {
        message: error.message,
        stack: error.stack ?? undefined,
        componentStack: errorInfo.componentStack ?? undefined,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Send error to backend for CloudWatch logging
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'REACT_ERROR_BOUNDARY',
          details: errorDetails,
        }),
      });
    } catch (logError) {
      console.error('Failed to log error to CloudWatch:', logError);
    }
  }

  private handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleReportBug = () => {
    const errorDetails = this.getErrorDetailsForReporting();
    const subject = encodeURIComponent('Application Error Report');
    const body = encodeURIComponent(`
Error Details:
${errorDetails}

Please describe what you were doing when this error occurred:

`);

    // Open email client with pre-filled error report
    window.open(`mailto:support@company.com?subject=${subject}&body=${body}`, '_blank');
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private getErrorDetailsForReporting(): string {
    const { error, errorInfo } = this.state;
    if (!error) return 'No error details available';

    return `
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Error Message: ${error.message}

Stack Trace:
${error.stack ?? 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack ?? 'No component stack available'}
`;
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            padding: 3,
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Something went wrong</AlertTitle>
                An unexpected error occurred. You can try reloading the page or report this issue to
                our support team.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                <Button variant="outlined" color="primary" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<BugReportIcon />}
                  onClick={this.handleReportBug}
                >
                  Report Bug
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Error Details
                </Typography>
                <IconButton
                  size="small"
                  onClick={this.toggleDetails}
                  sx={{
                    transform: this.state.showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>

              <Collapse in={this.state.showDetails}>
                <Box
                  sx={{
                    backgroundColor: 'grey.100',
                    padding: 2,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {this.getErrorDetailsForReporting()}
                  </Typography>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
