import { render, screen } from '@testing-library/react';
import { RoleGuard } from '../../../../src/components/common/RoleGuard';
import { useAuth } from '../../../../src/hooks/useAuth';
import type { User } from '../../../../src/types/auth';

// Mock the useAuth hook
jest.mock('../../../../src/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RoleGuard', () => {
  const adminUser: User = {
    userId: 'user-1',
    email: 'admin@example.com',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  const readonlyUser: User = {
    userId: 'user-2',
    email: 'readonly@example.com',
    role: 'readonly',
    firstName: 'Readonly',
    lastName: 'User',
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  describe('with admin role requirement', () => {
    it('renders children when user is admin', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: adminUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard requiredRole="admin">
          <div data-testid="admin-content">Admin Only Content</div>
        </RoleGuard>
      );

      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    it('does not render children when user is readonly', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: readonlyUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard requiredRole="admin">
          <div data-testid="admin-content">Admin Only Content</div>
        </RoleGuard>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('renders fallback when user lacks required role', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: readonlyUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard
          requiredRole="admin"
          fallback={<div data-testid="fallback-content">No Permission</div>}
        >
          <div data-testid="admin-content">Admin Only Content</div>
        </RoleGuard>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });
  });

  describe('with readonly role requirement', () => {
    it('renders children when user is admin', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: adminUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard requiredRole="readonly">
          <div data-testid="readonly-content">Readonly Content</div>
        </RoleGuard>
      );

      expect(screen.getByTestId('readonly-content')).toBeInTheDocument();
    });

    it('renders children when user is readonly', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: readonlyUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard requiredRole="readonly">
          <div data-testid="readonly-content">Readonly Content</div>
        </RoleGuard>
      );

      expect(screen.getByTestId('readonly-content')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('does not render children when no user', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard requiredRole="admin">
          <div data-testid="admin-content">Admin Only Content</div>
        </RoleGuard>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('renders fallback when no user', () => {
      mockUseAuth.mockReturnValue({
        state: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <RoleGuard
          requiredRole="admin"
          fallback={<div data-testid="fallback-content">Please Login</div>}
        >
          <div data-testid="admin-content">Admin Only Content</div>
        </RoleGuard>
      );

      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });
  });
});
