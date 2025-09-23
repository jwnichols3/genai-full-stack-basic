import { renderHook, waitFor } from '@testing-library/react';
import { useInstanceDetail } from '../../../src/hooks/useInstanceDetail';
import { ec2Service } from '../../../src/services/ec2';

// Mock the EC2 service
jest.mock('../../../src/services/ec2');
const mockEc2Service = ec2Service as jest.Mocked<typeof ec2Service>;

describe('useInstanceDetail', () => {
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
      Environment: 'test'
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
    jest.clearAllMocks();
  });

  it('should fetch instance details successfully', async () => {
    mockEc2Service.getInstanceDetails.mockResolvedValueOnce(mockInstanceDetail);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toEqual(mockInstanceDetail);
    expect(result.current.error).toBeNull();
    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
      'i-1234567890abcdef0',
      undefined
    );
  });

  it('should handle instance not found error', async () => {
    const error404 = new Error('API Error: 404 Not Found');
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce(error404);

    const { result } = renderHook(() =>
      useInstanceDetail('i-nonexistent')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBe('Instance i-nonexistent not found');
  });

  it('should handle access denied error', async () => {
    const error403 = new Error('API Error: 403 Forbidden');
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce(error403);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBe('Access denied. Insufficient permissions to view instance details');
  });

  it('should handle authentication failed error', async () => {
    const authError = new Error('Authentication failed');
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce(authError);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBe('Authentication failed. Please log in again');
  });

  it('should handle generic network error', async () => {
    const networkError = new Error('Network error');
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle unknown error', async () => {
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce('Unknown error');

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBe('Failed to load instance details');
  });

  it('should include region parameter when provided', async () => {
    mockEc2Service.getInstanceDetails.mockResolvedValueOnce(mockInstanceDetail);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0', 'us-west-2')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
      'i-1234567890abcdef0',
      'us-west-2'
    );
  });

  it('should refresh instance details when refresh is called', async () => {
    mockEc2Service.getInstanceDetails.mockResolvedValue(mockInstanceDetail);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledTimes(1);

    // Call refresh
    await result.current.refresh();

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledTimes(2);
  });

  it('should not fetch when instanceId is empty', async () => {
    const { result } = renderHook(() =>
      useInstanceDetail('')
    );

    // Should not be loading and should not call the service
    expect(result.current.loading).toBe(false);
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockEc2Service.getInstanceDetails).not.toHaveBeenCalled();
  });

  it('should refetch when instanceId changes', async () => {
    mockEc2Service.getInstanceDetails.mockResolvedValue(mockInstanceDetail);

    const { result, rerender } = renderHook(
      ({ instanceId }) => useInstanceDetail(instanceId),
      {
        initialProps: { instanceId: 'i-1234567890abcdef0' }
      }
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
      'i-1234567890abcdef0',
      undefined
    );

    // Change instanceId
    rerender({ instanceId: 'i-0987654321fedcba0' });

    await waitFor(() => {
      expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
        'i-0987654321fedcba0',
        undefined
      );
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledTimes(2);
  });

  it('should refetch when region changes', async () => {
    mockEc2Service.getInstanceDetails.mockResolvedValue(mockInstanceDetail);

    const { result, rerender } = renderHook(
      ({ region }) => useInstanceDetail('i-1234567890abcdef0', region),
      {
        initialProps: { region: 'us-east-1' }
      }
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
      'i-1234567890abcdef0',
      'us-east-1'
    );

    // Change region
    rerender({ region: 'us-west-2' });

    await waitFor(() => {
      expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledWith(
        'i-1234567890abcdef0',
        'us-west-2'
      );
    });

    expect(mockEc2Service.getInstanceDetails).toHaveBeenCalledTimes(2);
  });

  it('should handle console.error during API call', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('API Error');
    mockEc2Service.getInstanceDetails.mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useInstanceDetail('i-1234567890abcdef0')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch instance details:',
      error
    );

    consoleErrorSpy.mockRestore();
  });
});