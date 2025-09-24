import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@mui/material';
import { PermissionTooltip } from '../../../../src/components/common/PermissionTooltip';
import { useAuth } from '../../../../src/hooks/useAuth';
import type { User } from '../../../../src/types/auth';

// Mock the useAuth hook
jest.mock('../../../../src/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('PermissionTooltip', () => {
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
    it('renders enabled button when user is admin', () => {
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
        <PermissionTooltip requiredRole="admin">
          <Button data-testid="test-button">Admin Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('disabled');
    });

    it('renders disabled button with tooltip when user is readonly', async () => {
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
        <PermissionTooltip requiredRole="admin">
          <Button data-testid="test-button">Admin Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('disabled');

      // Hover to show tooltip using fireEvent for disabled elements
      const buttonParent = button.parentElement;
      fireEvent.mouseEnter(buttonParent!);
      expect(
        await screen.findByText('This action requires administrator privileges')
      ).toBeInTheDocument();
    });

    it('shows custom tooltip message', async () => {
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
        <PermissionTooltip requiredRole="admin" message="Custom permission message">
          <Button data-testid="test-button">Admin Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      const buttonParent = button.parentElement;
      fireEvent.mouseEnter(buttonParent!);
      expect(await screen.findByText('Custom permission message')).toBeInTheDocument();
    });
  });

  describe('with readonly role requirement', () => {
    it('renders enabled button when user is admin', () => {
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
        <PermissionTooltip requiredRole="readonly">
          <Button data-testid="test-button">User Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('disabled');
    });

    it('renders enabled button when user is readonly', () => {
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
        <PermissionTooltip requiredRole="readonly">
          <Button data-testid="test-button">User Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('disabled');
    });
  });

  describe('when user is not authenticated', () => {
    it('renders disabled button with tooltip when no user', async () => {
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
        <PermissionTooltip requiredRole="admin">
          <Button data-testid="test-button">Admin Action</Button>
        </PermissionTooltip>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('disabled');

      const buttonParent = button.parentElement;
      fireEvent.mouseEnter(buttonParent!);
      expect(
        await screen.findByText('This action requires administrator privileges')
      ).toBeInTheDocument();
    });
  });
});
