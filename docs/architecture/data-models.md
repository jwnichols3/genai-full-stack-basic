# Data Models

## User

**Purpose:** Represents authenticated users in the system with their roles and preferences

**Key Attributes:**

- userId: string - Cognito user ID (UUID)
- email: string - User's email address (unique)
- role: 'admin' | 'readonly' - User's permission level
- firstName: string - User's first name
- lastName: string - User's last name
- lastLogin: ISO8601 timestamp - Last successful login time
- createdAt: ISO8601 timestamp - Account creation time

### TypeScript Interface

```typescript
interface User {
  userId: string;
  email: string;
  role: 'admin' | 'readonly';
  firstName: string;
  lastName: string;
  lastLogin?: string;
  createdAt: string;
}
```

### Relationships

- One-to-many with AuditLog entries

## EC2Instance

**Purpose:** Represents EC2 instance data retrieved from AWS with enriched metadata

**Key Attributes:**

- instanceId: string - AWS EC2 instance ID
- instanceType: string - EC2 instance type (e.g., t2.micro)
- state: InstanceState - Current instance state
- publicIp: string | null - Public IP address if assigned
- privateIp: string - Private IP address
- launchTime: ISO8601 timestamp - Instance launch time
- availabilityZone: string - AWS availability zone
- tags: Record<string, string> - Instance tags

### TypeScript Interface

```typescript
type InstanceState =
  | 'pending'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'shutting-down'
  | 'terminated';

interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: InstanceState;
  publicIp: string | null;
  privateIp: string;
  launchTime: string;
  availabilityZone: string;
  tags: Record<string, string>;
  monitoring?: {
    state: 'enabled' | 'disabled';
  };
}
```

### Relationships

- Referenced in AuditLog entries for instance actions

## AuditLog

**Purpose:** Immutable audit trail of all administrative actions performed in the system

**Key Attributes:**

- auditId: string - Unique audit entry ID (UUID)
- userId: string - ID of user who performed action
- userEmail: string - Email of user (denormalized for quick access)
- action: AuditAction - Type of action performed
- resourceType: string - Type of resource affected
- resourceId: string - ID of affected resource
- timestamp: ISO8601 timestamp - When action occurred
- details: object - Additional action-specific data
- ipAddress: string - Client IP address

### TypeScript Interface

```typescript
type AuditAction = 'LOGIN' | 'LOGOUT' | 'REBOOT_INSTANCE' | 'VIEW_INSTANCE' | 'ACCESS_DENIED';

interface AuditLog {
  auditId: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: 'EC2_INSTANCE' | 'USER' | 'SYSTEM';
  resourceId: string;
  timestamp: string;
  details?: Record<string, any>;
  ipAddress: string;
}
```

### Relationships

- Many-to-one with User
- References EC2Instance for instance-related actions

## CloudWatchMetrics

**Purpose:** Container for CloudWatch metrics data for EC2 instances

**Key Attributes:**

- instanceId: string - EC2 instance ID
- metricName: string - CloudWatch metric name
- dataPoints: MetricDataPoint[] - Time series data
- unit: string - Metric unit (Percent, Bytes, etc.)
- period: number - Data point interval in seconds

### TypeScript Interface

```typescript
interface MetricDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface CloudWatchMetrics {
  instanceId: string;
  metricName: string;
  dataPoints: MetricDataPoint[];
  unit: string;
  period: number;
  stat: 'Average' | 'Sum' | 'Maximum' | 'Minimum';
}
```

### Relationships

- Many-to-one with EC2Instance
