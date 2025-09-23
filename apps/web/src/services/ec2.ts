import { EC2Instance } from '@ec2-manager/shared';
import { authService } from './auth';

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
    const token = authService.getIdToken(); // Use ID token instead of access token
    console.log('🔑 EC2 Service using ID token:', token ? 'Token present' : 'No token');

    if (!token) {
      // No token available, redirect to login
      console.log('❌ No authentication token available, redirecting to login');
      window.location.href = '/login';
      throw new Error('No authentication token available');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('🌐 Making API request to:', url);
    console.log('🔒 ID Token details:', {
      tokenType: 'ID_TOKEN',
      tokenLength: token.length,
      tokenParts: token.split('.').length,
      tokenPrefix: token.substring(0, 50),
      tokenSuffix: token.length > 50 ? token.substring(token.length - 20) : 'N/A',
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        await authService.logout();
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
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
