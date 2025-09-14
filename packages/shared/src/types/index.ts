export interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated';
  launchTime: string;
  publicIpAddress?: string;
  privateIpAddress: string;
  tags: Record<string, string>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: 'START' | 'STOP' | 'TERMINATE' | 'REBOOT' | 'CREATE' | 'MODIFY';
  resourceId: string;
  resourceType: 'EC2_INSTANCE';
  details: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  roles: string[];
  createdAt: string;
  lastLogin?: string;
}