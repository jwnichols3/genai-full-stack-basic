// Tests for LoginForm component
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { LoginForm } from '../../../../src/components/auth/LoginForm';
import type { LoginCredentials } from '../../../../src/types/auth';

const theme = createTheme();

const renderLoginForm = (
  props: {
    onSubmit?: (credentials: LoginCredentials) => Promise<void>;
    loading?: boolean;
    error?: string | null;
  } = {}
) => {
  const defaultProps = {
    onSubmit: jest.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
    ...props,
  };

  return render(
    <ThemeProvider theme={theme}>
      <LoginForm {...defaultProps} />
    </ThemeProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render login form with all elements', () => {
      renderLoginForm();

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/enter your credentials to access/i)).toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Invalid credentials';
      renderLoginForm({ error: errorMessage });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      renderLoginForm({ loading: true });

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  describe('form validation', () => {
    it('should show email validation error for empty email', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.click(emailInput);
      await user.tab(); // Move focus away to trigger validation

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show email validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show password validation error for empty password', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.click(passwordInput);
      await user.tab(); // Move focus away

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show password validation error for short password', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters long/i)
        ).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with valid credentials', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      renderLoginForm({ onSubmit: mockOnSubmit });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should not call onSubmit with invalid credentials', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      renderLoginForm({ onSubmit: mockOnSubmit });

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should prevent double submission during loading', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const mockOnSubmit = jest.fn().mockReturnValue(submitPromise);

      renderLoginForm({ onSubmit: mockOnSubmit });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // First click should work
      await user.click(submitButton);

      // Check that loading state is shown
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise to finish the test
      resolveSubmit!();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle form submission using Enter key', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      renderLoginForm({ onSubmit: mockOnSubmit });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and attributes', () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveProperty('autoFocus', true);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');

      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.click(submitButton);

      await waitFor(() => {
        const errorText = screen.getByText(/email is required/i);
        expect(errorText).toBeInTheDocument();
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('responsive design', () => {
    it('should render properly on different screen sizes', () => {
      // Mock useMediaQuery for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes('(max-width: 900px)'), // sm breakpoint
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderLoginForm();

      // Should still render main elements
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });
});
