import { useState, useEffect, useCallback } from 'react';
import { ec2Service, EC2InstanceDetail } from '../services/ec2';

interface UseInstanceDetailResult {
  instance: EC2InstanceDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useInstanceDetail = (instanceId: string, region?: string): UseInstanceDetailResult => {
  const [instance, setInstance] = useState<EC2InstanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstanceDetail = useCallback(async () => {
    if (!instanceId) return;

    setLoading(true);
    setError(null);

    try {
      const instanceDetail = await ec2Service.getInstanceDetails(instanceId, region);
      setInstance(instanceDetail);
    } catch (err) {
      console.error('Failed to fetch instance details:', err);

      if (err instanceof Error) {
        if (err.message.includes('404')) {
          setError(`Instance ${instanceId} not found`);
        } else if (err.message.includes('403')) {
          setError('Access denied. Insufficient permissions to view instance details');
        } else if (err.message.includes('Authentication failed')) {
          setError('Authentication failed. Please log in again');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load instance details');
      }
    } finally {
      setLoading(false);
    }
  }, [instanceId, region]);

  const refresh = useCallback(async () => {
    await fetchInstanceDetail();
  }, [fetchInstanceDetail]);

  useEffect(() => {
    void fetchInstanceDetail();
  }, [fetchInstanceDetail]);

  return {
    instance,
    loading,
    error,
    refresh,
  };
};
