/* eslint-disable no-console */
import { EC2Instance } from '@ec2-manager/shared';
import { authService } from './auth';
import { errorHandler } from './errorHandler';
import { isNetworkError } from '../utils/errorUtils';

// API Base URL from environment or default
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) ??
  'https://xg34xg3ngh.execute-api.us-west-2.amazonaws.com/dev';

interface ListInstancesResponse {
  instances: EC2Instance[];
}

export interface EC2InstanceDetail extends EC2Instance {
  availabilityZone: string;
  publicIp?: string | null;
  privateIp: string;
  monitoring?: {
    state: 'enabled' | 'disabled';
  };
  vpcId?: string;
  subnetId?: string;
  securityGroups?: Array<{
    groupId: string;
    groupName: string;
  }>;
  keyName?: string;
  instanceProfile?: {
    arn: string;
    id: string;
  };
}

interface FilterOptions {
  state?: string;
  tag?: string;
  region?: string;
}

class EC2Service {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = authService.getIdToken();
    console.log('🔑 EC2 Service using ID token:', token ? 'Token present' : 'No token');

    if (!token) {
      // Handle missing token with proper error
      const error = await errorHandler.handleApiError(
        new Error('No authentication token available'),
        { showToast: true, redirect: true }
      );
      throw error;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('🌐 Making API request to:', url);

    // Add timeout and retry logic
    const timeoutMs = 30000; // 30 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Use centralized error handler for HTTP errors
        const apiError = await errorHandler.handleApiError(response, {
          showToast: true,
          logToCloudWatch: true,
          redirect: response.status === 401,
        });
        throw apiError;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Timeout error
          const timeoutError = await errorHandler.handleApiError(new Error('Request timed out'), {
            showToast: true,
            logToCloudWatch: true,
          });
          throw timeoutError;
        }

        if (isNetworkError(error)) {
          // Network error
          const networkError = errorHandler.handleNetworkError(error);
          throw networkError;
        }
      }

      // Re-throw API errors from error handler
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw error;
      }

      // Handle unexpected errors - convert to Error first
      const errorObj = error instanceof Error ? error : new Error('Unexpected error occurred');
      const unexpectedError = await errorHandler.handleApiError(errorObj, {
        showToast: true,
        logToCloudWatch: true,
      });
      throw unexpectedError;
    }
  }

  async listInstances(filters?: FilterOptions): Promise<EC2Instance[]> {
    const params = new URLSearchParams();

    if (filters?.state) {
      params.append('state', filters.state);
    }
    if (filters?.tag) {
      params.append('tag', filters.tag);
    }
    if (filters?.region) {
      params.append('region', filters.region);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.makeRequest<ListInstancesResponse>(
      `/api/v1/instances${queryString}`
    );

    return response.instances;
  }

  async getInstanceDetails(instanceId: string, region?: string): Promise<EC2InstanceDetail> {
    const params = new URLSearchParams();

    if (region) {
      params.append('region', region);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.makeRequest<EC2InstanceDetail>(
      `/api/v1/instances/${instanceId}${queryString}`
    );

    return response;
  }
}

export const ec2Service = new EC2Service();
