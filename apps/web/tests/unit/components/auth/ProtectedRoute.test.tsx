// Tests for ProtectedRoute component
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ProtectedRoute } from '../../../../src/components/auth/ProtectedRoute';
import { useAuth } from '../../../../src/hooks/useAuth';
import type { AuthState } from '../../../../src/types/auth';

// Mock the useAuth hook
jest.mock('../../../../src/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock react-router-dom Navigate component
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, state }: { to: string; state?: any }) => {
    mockNavigate(to, state);
    return <div data-testid="navigate">Redirecting to {to}</div>;
  },
  useLocation: () => ({ pathname: '/dashboard' }),
}));

const theme = createTheme();

const renderProtectedRoute = (
  props: {
    requireRole?: 'admin' | 'readonly';
    fallbackPath?: string;
  } = {}
) => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <ProtectedRoute {...props}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const createMockAuthState = (overrides: Partial<AuthState> = {}): AuthState => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  ...overrides,
});

const createMockUser = (role: 'admin' | 'readonly' = 'admin') => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  role,
  firstName: 'John',
  lastName: 'Doe',
  lastLogin: '2023-01-01T00:00:00Z',
  createdAt: '2023-01-01T00:00:00Z',
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProtectedRoute', () => {
  describe('loading state', () => {
    it('should show loading spinner when auth state is loading', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isLoading: true }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: false, user: null }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(mockNavigate).toHaveBeenCalledWith('/login', { from: '/dashboard' });
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to custom fallback path when specified', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: false, user: null }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ fallbackPath: '/custom-login' });

      expect(mockNavigate).toHaveBeenCalledWith('/custom-login', { from: '/dashboard' });
    });

    it('should redirect when user is authenticated but user object is null', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: null }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(mockNavigate).toHaveBeenCalledWith('/login', { from: '/dashboard' });
    });
  });

  describe('authenticated state without role requirements', () => {
    it('should render children when user is authenticated (admin user)', () => {
      const mockUser = createMockUser('admin');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should render children when user is authenticated (readonly user)', () => {
      const mockUser = createMockUser('readonly');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('role-based access control', () => {
    it('should allow admin user access to admin-required routes', () => {
      const mockUser = createMockUser('admin');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'admin' });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow admin user access to readonly-required routes', () => {
      const mockUser = createMockUser('admin');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'readonly' });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow readonly user access to readonly-required routes', () => {
      const mockUser = createMockUser('readonly');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'readonly' });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should deny readonly user access to admin-required routes', () => {
      const mockUser = createMockUser('readonly');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'admin' });

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/you do not have permission/i)).toBeInTheDocument();
      expect(screen.getByText(/required role: admin/i)).toBeInTheDocument();
      expect(screen.getByText(/your role: readonly/i)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy for access denied page', () => {
      const mockUser = createMockUser('readonly');
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isAuthenticated: true, user: mockUser }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'admin' });

      const heading = screen.getByRole('heading', { name: /access denied/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H4'); // MUI Typography variant="h4" creates h4 element
    });

    it('should have proper loading announcement', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({ isLoading: true }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing user data gracefully', () => {
      mockUseAuth.mockReturnValue({
        state: createMockAuthState({
          isAuthenticated: true,
          user: { ...createMockUser('admin'), firstName: '', lastName: '' },
        }),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      renderProtectedRoute({ requireRole: 'admin' });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});
