import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useInstances } from '../../../src/hooks/useInstances';
// Mock the ec2Service
jest.mock('../../../src/services/ec2', () => ({
  ec2Service: {
    listInstances: jest.fn(),
  },
}));

import { ec2Service } from '../../../src/services/ec2';
const mockEc2Service = ec2Service as jest.Mocked<typeof ec2Service>;

// Mock timers
jest.useFakeTimers();

const mockInstances = [
  {
    instanceId: 'i-1234567890',
    instanceType: 't3.micro',
    state: 'running' as const,
    launchTime: '2024-01-01T00:00:00Z',
    publicIpAddress: '1.2.3.4',
    privateIpAddress: '10.0.1.1',
    tags: { Name: 'Test Instance' },
  },
  {
    instanceId: 'i-0987654321',
    instanceType: 't3.small',
    state: 'stopped' as const,
    launchTime: '2024-01-01T00:00:00Z',
    publicIpAddress: undefined,
    privateIpAddress: '10.0.1.2',
    tags: { Name: 'Test Instance 2' },
  },
];

describe('useInstances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should fetch instances on initial load', async () => {
    mockEc2Service.listInstances.mockResolvedValue(mockInstances);

    const { result } = renderHook(() => useInstances(0));

    expect(result.current.loading).toBe(true);
    expect(result.current.instances).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instances).toEqual(mockInstances);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Failed to fetch instances';
    mockEc2Service.listInstances.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useInstances(0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.instances).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should refresh instances manually', async () => {
    mockEc2Service.listInstances.mockResolvedValue(mockInstances);

    const { result } = renderHook(() => useInstances(0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockEc2Service.listInstances.mockResolvedValue([
      ...mockInstances,
      {
        instanceId: 'i-newinstance',
        instanceType: 't3.nano',
        state: 'pending' as const,
        launchTime: '2024-01-02T00:00:00Z',
        publicIpAddress: undefined,
        privateIpAddress: '10.0.1.3',
        tags: { Name: 'New Instance' },
      },
    ]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.instances).toHaveLength(3);
    expect(result.current.instances[2]?.instanceId).toBe('i-newinstance');
  });

  it('should auto-refresh instances', async () => {
    mockEc2Service.listInstances.mockResolvedValue(mockInstances);

    const { result } = renderHook(() => useInstances(1000)); // 1 second interval

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEc2Service.listInstances).toHaveBeenCalledTimes(1);

    // Fast-forward time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockEc2Service.listInstances).toHaveBeenCalledTimes(2);
    });
  });

  it('should apply filters', async () => {
    mockEc2Service.listInstances.mockResolvedValue(mockInstances);

    const { result } = renderHook(() => useInstances(0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilters({ state: 'running' });
    });

    expect(mockEc2Service.listInstances).toHaveBeenCalledWith({ state: 'running' });
  });

  it('should pause auto-refresh when filters are applied', async () => {
    mockEc2Service.listInstances.mockResolvedValue(mockInstances);

    const { result } = renderHook(() => useInstances(1000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilters({ state: 'running' });
    });

    // Auto-refresh should be paused for 5 seconds after filtering
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not have called listInstances again due to pause
    expect(mockEc2Service.listInstances).toHaveBeenCalledTimes(2); // Initial + filter call
  });
});
