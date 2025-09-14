# Frontend Architecture

## Component Architecture

### Component Organization
```text
src/components/
├── common/
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── Feedback/
│   │   ├── Alert.tsx
│   │   ├── Snackbar.tsx
│   │   └── LoadingSpinner.tsx
│   └── DataDisplay/
│       ├── DataTable.tsx
│       ├── Card.tsx
│       └── EmptyState.tsx
├── auth/
│   ├── LoginForm.tsx
│   ├── ProtectedRoute.tsx
│   ├── ForgotPassword.tsx
│   └── SessionTimeout.tsx
├── instances/
│   ├── InstanceList/
│   │   ├── InstanceList.tsx
│   │   ├── InstanceFilters.tsx
│   │   └── InstanceListItem.tsx
│   ├── InstanceDetail/
│   │   ├── InstanceDetail.tsx
│   │   ├── InstanceMetrics.tsx
│   │   └── InstanceActions.tsx
│   └── shared/
│       ├── InstanceStatusBadge.tsx
│       └── InstanceTypeIcon.tsx
└── audit/
    ├── AuditLogTable.tsx
    ├── AuditLogFilters.tsx
    └── AuditLogEntry.tsx
```

### Component Template
```typescript
// Example: InstanceListItem.tsx
import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box
} from '@mui/material';
import { RestartAlt, Info } from '@mui/icons-material';
import { EC2Instance } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { InstanceStatusBadge } from '../shared/InstanceStatusBadge';

interface InstanceListItemProps {
  instance: EC2Instance;
  onReboot: (instanceId: string) => void;
  onViewDetails: (instanceId: string) => void;
}

export const InstanceListItem = memo<InstanceListItemProps>(({
  instance,
  onReboot,
  onViewDetails
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              {instance.tags?.Name || instance.instanceId}
            </Typography>
            <Typography color="textSecondary" variant="body2">
              {instance.instanceType} • {instance.availabilityZone}
            </Typography>
            <Box mt={1}>
              <InstanceStatusBadge state={instance.state} />
            </Box>
          </Box>
          <Box>
            <IconButton onClick={() => onViewDetails(instance.instanceId)}>
              <Info />
            </IconButton>
            {isAdmin && instance.state === 'running' && (
              <IconButton
                onClick={() => onReboot(instance.instanceId)}
                color="warning"
              >
                <RestartAlt />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

InstanceListItem.displayName = 'InstanceListItem';
```

## State Management Architecture

### State Structure
```typescript
// src/store/types.ts
export interface AppState {
  auth: AuthState;
  instances: InstancesState;
  ui: UIState;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface InstancesState {
  items: EC2Instance[];
  selectedInstance: EC2Instance | null;
  filters: InstanceFilters;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  notifications: Notification[];
  sidebarOpen: boolean;
}

// src/store/AuthContext.tsx
import React, { createContext, useReducer, useCallback } from 'react';
import { authReducer, initialAuthState } from './authReducer';
import { authService } from '@/services/auth';

export const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}>({
  state: initialAuthState,
  login: async () => {},
  logout: () => {},
  refreshToken: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
    }
  }, []);

  // ... other methods

  return (
    <AuthContext.Provider value={{ state, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### State Management Patterns
- Use Context API for global auth state
- Use local component state for UI-only state
- Implement optimistic updates for better UX
- Cache API responses with timestamps
- Use useReducer for complex state logic
- Implement state persistence for user preferences

## Routing Architecture

### Route Organization
```text
/                           # Redirects to /dashboard or /login
/login                      # Public: Login page
/forgot-password           # Public: Password reset
/dashboard                 # Protected: Main dashboard with instance list
/instances/:id             # Protected: Instance detail view
/instances/:id/metrics     # Protected: Instance metrics view
/audit                     # Protected: Audit logs (admin only)
/profile                   # Protected: User profile/settings
/404                       # Public: Not found page
```

### Protected Route Pattern
```typescript
// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'readonly';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

// Usage in App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } />
  <Route path="/audit" element={
    <ProtectedRoute requiredRole="admin">
      <AuditLogPage />
    </ProtectedRoute>
  } />
</Routes>
```

## Frontend Services Layer

### API Client Setup
```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, refreshAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.ec2-manager.example.com/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          try {
            await refreshAuthToken();
            // Retry original request
            return this.client.request(error.config!);
          } catch (refreshError) {
            // Redirect to login
            window.location.href = '/login';
          }
        }

        // Format error for consistent handling
        const formattedError = {
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.error?.message || 'An unexpected error occurred',
          status: error.response?.status
        };

        return Promise.reject(formattedError);
      }
    );
  }

  get<T>(url: string, params?: any) {
    return this.client.get<T>(url, { params });
  }

  post<T>(url: string, data?: any) {
    return this.client.post<T>(url, data);
  }

  put<T>(url: string, data?: any) {
    return this.client.put<T>(url, data);
  }

  delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

export const apiClient = new ApiClient();
```

### Service Example
```typescript
// src/services/ec2.ts
import { apiClient } from './api';
import { EC2Instance, CloudWatchMetrics, RebootResponse } from '@/types';

export class EC2Service {
  async listInstances(filters?: {
    state?: string;
    tag?: string;
  }): Promise<EC2Instance[]> {
    const response = await apiClient.get<{ instances: EC2Instance[] }>(
      '/instances',
      filters
    );
    return response.data.instances;
  }

  async getInstanceDetails(instanceId: string): Promise<EC2Instance> {
    const response = await apiClient.get<EC2Instance>(
      `/instances/${instanceId}`
    );
    return response.data;
  }

  async rebootInstance(instanceId: string): Promise<RebootResponse> {
    const response = await apiClient.post<RebootResponse>(
      `/instances/${instanceId}/reboot`
    );
    return response.data;
  }

  async getInstanceMetrics(
    instanceId: string,
    metricName: string,
    options?: {
      period?: number;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<CloudWatchMetrics> {
    const response = await apiClient.get<CloudWatchMetrics>(
      `/instances/${instanceId}/metrics`,
      { metricName, ...options }
    );
    return response.data;
  }
}

export const ec2Service = new EC2Service();
```
