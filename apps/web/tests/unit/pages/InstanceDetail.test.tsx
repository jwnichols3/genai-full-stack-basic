import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../src/styles/theme';
import InstanceDetail from '../../../src/pages/InstanceDetail';
import { useInstanceDetail } from '../../../src/hooks/useInstanceDetail';
import { useResponsive } from '../../../src/utils/responsive';

// Mock hooks
jest.mock('../../../src/hooks/useInstanceDetail');
jest.mock('../../../src/utils/responsive');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ instanceId: 'i-1234567890abcdef0' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null })
}));

const mockUseInstanceDetail = useInstanceDetail as jest.MockedFunction<typeof useInstanceDetail>;
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter initialEntries={['/instances/i-1234567890abcdef0']}>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

describe('InstanceDetail', () => {
  const mockInstanceDetail = {
    instanceId: 'i-1234567890abcdef0',
    instanceType: 't3.micro',
    state: 'running' as const,
    publicIp: '54.123.45.67',
    privateIp: '10.0.1.100',
    privateIpAddress: '10.0.1.100',
    publicIpAddress: '54.123.45.67',
    launchTime: '2023-01-01T12:00:00.000Z',
    availabilityZone: 'us-east-1a',
    tags: {
      Name: 'Test Instance',
      Environment: 'test',
      Project: 'TestProject'
    },
    monitoring: {
      state: 'enabled' as const
    },
    vpcId: 'vpc-12345',
    subnetId: 'subnet-67890',
    securityGroups: [
      {
        groupId: 'sg-123456',
        groupName: 'test-sg'
      }
    ],
    keyName: 'test-key'
  };

  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      isExtraLarge: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeleton when loading', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: null,
      loading: true,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // Should show loading skeletons
    expect(screen.getAllByTestId('skeleton')).toHaveLength(0); // Material-UI Skeletons don't have testId by default
    // Check for skeleton components by their role or other identifiers
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error state when there is an error', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: null,
      loading: false,
      error: 'Instance not found',
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Instance not found')).toBeInTheDocument();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('should render instance details when data is loaded', async () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // Check for main instance information
    expect(screen.getByText('Test Instance')).toBeInTheDocument();
    expect(screen.getByText('i-1234567890abcdef0')).toBeInTheDocument();
    expect(screen.getByText('t3.micro')).toBeInTheDocument();
    expect(screen.getByText('us-east-1a')).toBeInTheDocument();

    // Check for network information
    expect(screen.getByText('54.123.45.67')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('vpc-12345')).toBeInTheDocument();
    expect(screen.getByText('subnet-67890')).toBeInTheDocument();

    // Check for tags
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();

    // Check for security groups
    expect(screen.getByText('sg-123456')).toBeInTheDocument();
    expect(screen.getByText('test-sg')).toBeInTheDocument();

    // Check for breadcrumbs
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Instance Details')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    const mockRefresh = jest.fn();
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: mockRefresh
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should show loading state on refresh button when loading', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: true,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    const refreshButton = screen.getByLabelText(/refresh/i);
    expect(refreshButton).toBeDisabled();
  });

  it('should handle instance with no public IP', () => {
    const instanceWithoutPublicIp = {
      ...mockInstanceDetail,
      publicIp: undefined,
      publicIpAddress: undefined
    };

    mockUseInstanceDetail.mockReturnValue({
      instance: instanceWithoutPublicIp,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
  });

  it('should handle instance with no tags', () => {
    const instanceWithoutTags = {
      ...mockInstanceDetail,
      tags: {}
    };

    mockUseInstanceDetail.mockReturnValue({
      instance: instanceWithoutTags,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('No tags found for this instance')).toBeInTheDocument();
  });

  it('should handle instance with no security groups', () => {
    const instanceWithoutSecurityGroups = {
      ...mockInstanceDetail,
      securityGroups: []
    };

    mockUseInstanceDetail.mockReturnValue({
      instance: instanceWithoutSecurityGroups,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('No security groups')).toBeInTheDocument();
  });

  it('should handle mobile responsive layout', () => {
    mockUseResponsive.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      isExtraLarge: false
    });

    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // The h5 variant should be used on mobile instead of h4
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('MuiTypography-h5');
  });

  it('should display instance state badge', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // The InstanceStatusBadge component should render the state
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('should show monitoring state when available', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('enabled')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('should handle instance without monitoring data', () => {
    const instanceWithoutMonitoring = {
      ...mockInstanceDetail,
      monitoring: undefined
    };

    mockUseInstanceDetail.mockReturnValue({
      instance: instanceWithoutMonitoring,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // Monitoring section should not be present
    expect(screen.queryByText('Monitoring')).not.toBeInTheDocument();
  });

  it('should show warning when there is an error but instance data is still available', () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: 'Failed to refresh',
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Failed to refresh instance details: Failed to refresh')).toBeInTheDocument();
    // Instance data should still be shown
    expect(screen.getByText('Test Instance')).toBeInTheDocument();
  });

  it('should format launch time with tooltip', async () => {
    mockUseInstanceDetail.mockReturnValue({
      instance: mockInstanceDetail,
      loading: false,
      error: null,
      refresh: jest.fn()
    });

    render(
      <TestWrapper>
        <InstanceDetail />
      </TestWrapper>
    );

    // Should show relative time
    const launchTimeElement = screen.getByText(/ago/);
    expect(launchTimeElement).toBeInTheDocument();

    // Should have tooltip with absolute time
    fireEvent.mouseOver(launchTimeElement);

    await waitFor(() => {
      // The tooltip should show the absolute time
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});