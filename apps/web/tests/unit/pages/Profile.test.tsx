import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../../../src/pages/Profile';
import { useAuth } from '../../../src/hooks/useAuth';
import type { User } from '../../../src/types/auth';

// Mock the useAuth hook
jest.mock('../../../src/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock time utilities
jest.mock('../../../src/utils/timeUtils', () => ({
  formatAbsoluteTime: jest.fn((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }),
}));

// Wrapper component for Router context
const ProfileWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Profile', () => {
  const adminUser: User = {
    userId: 'admin-user-123',
    email: 'admin@example.com',
    role: 'admin',
    firstName: 'John',
    lastName: 'Admin',
    createdAt: '2023-01-01T00:00:00.000Z',
    lastLogin: '2023-12-01T10:30:00.000Z',
  };

  const readonlyUser: User = {
    userId: 'readonly-user-456',
    email: 'user@example.com',
    role: 'readonly',
    firstName: 'Jane',
    lastName: 'User',
    createdAt: '2023-02-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  describe('when user is admin', () => {
    beforeEach(() => {
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
    });

    it('renders user profile information', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      // Check header
      expect(screen.getByRole('heading', { name: /user profile/i })).toBeInTheDocument();

      // Check user details
      expect(screen.getByText('John Admin')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin-user-123')).toBeInTheDocument();

      // Check role chip
      const adminChips = screen.getAllByText(/admin/i);
      expect(adminChips.length).toBeGreaterThan(0);
    });

    it('displays admin privileges information', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Administrator Privileges:')).toBeInTheDocument();
      expect(screen.getByText(/View all EC2 instances/)).toBeInTheDocument();
      expect(screen.getByText(/Start, stop, and reboot instances/)).toBeInTheDocument();
      expect(screen.getByText(/Access system settings/)).toBeInTheDocument();
    });

    it('displays creation and last login dates', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Account Created')).toBeInTheDocument();
      expect(screen.getByText('Last Login')).toBeInTheDocument();
    });
  });

  describe('when user is readonly', () => {
    beforeEach(() => {
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
    });

    it('renders user profile information', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Jane User')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('readonly-user-456')).toBeInTheDocument();
    });

    it('displays readonly access information', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Read-Only Access:')).toBeInTheDocument();
      expect(screen.getByText(/View EC2 instances and their status/)).toBeInTheDocument();
      expect(
        screen.getByText(/Contact your administrator to request additional permissions/)
      ).toBeInTheDocument();
    });

    it('does not display last login when not available', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Account Created')).toBeInTheDocument();
      expect(screen.queryByText('Last Login')).not.toBeInTheDocument();
    });
  });

  describe('when no user is authenticated', () => {
    beforeEach(() => {
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
    });

    it('shows loading message', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });
  });

  describe('user initials', () => {
    beforeEach(() => {
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
    });

    it('displays correct initials in avatar', () => {
      render(
        <ProfileWrapper>
          <Profile />
        </ProfileWrapper>
      );

      // The avatar should display "JA" for "John Admin"
      expect(screen.getByText('JA')).toBeInTheDocument();
    });
  });
});
