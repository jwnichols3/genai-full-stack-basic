import { useState, useEffect, useCallback } from 'react';
import { EC2Instance } from '@ec2-manager/shared';
import { ec2Service } from '../services/ec2';
import { config } from '../config/environment';

interface FilterOptions {
  state?: string;
  tag?: string;
  region?: string;
}

interface UseInstancesReturn {
  instances: EC2Instance[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  setFilters: (filters: FilterOptions) => void;
}

export const useInstances = (autoRefreshInterval: number = 30000): UseInstancesReturn => {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Always include the configured AWS region
      const filtersWithRegion = {
        ...filters,
        region: filters.region ?? config.cognito.region,
      };
      const data = await ec2Service.listInstances(filtersWithRegion);
      setInstances(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refresh = useCallback(async () => {
    await fetchInstances();
  }, [fetchInstances]);

  // Initial load
  useEffect(() => {
    void fetchInstances();
  }, [fetchInstances]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled || autoRefreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      if (!loading && autoRefreshEnabled) {
        void fetchInstances();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [fetchInstances, loading, autoRefreshEnabled, autoRefreshInterval]);

  // Pause auto-refresh when user is actively filtering/interacting
  const setFiltersWithPause = useCallback((newFilters: FilterOptions) => {
    setAutoRefreshEnabled(false);
    setFilters(newFilters);

    // Resume auto-refresh after 5 seconds of inactivity
    setTimeout(() => {
      setAutoRefreshEnabled(true);
    }, 5000);
  }, []);

  return {
    instances,
    loading,
    error,
    lastUpdated,
    refresh,
    setFilters: setFiltersWithPause,
  };
};