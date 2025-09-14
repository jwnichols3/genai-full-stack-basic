# Testing Strategy

## Testing Pyramid
```text
        E2E Tests (5%)
       /              \
    Integration Tests (25%)
    /                    \
Frontend Unit (35%)  Backend Unit (35%)
```

## Test Organization

### Frontend Tests
```text
apps/web/tests/
├── unit/
│   ├── components/      # Component tests
│   ├── hooks/           # Hook tests
│   └── services/        # Service tests
├── integration/
│   ├── auth-flow.test.tsx
│   └── instance-management.test.tsx
└── setup.ts
```

### Backend Tests
```text
apps/api/tests/
├── unit/
│   ├── functions/       # Lambda handler tests
│   ├── services/        # Service tests
│   └── utils/          # Utility tests
├── integration/
│   ├── api/            # API integration tests
│   └── aws/            # AWS service tests
└── setup.ts
```

### E2E Tests
```text
tests/e2e/
├── specs/
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── admin-actions.spec.ts
├── fixtures/
└── playwright.config.ts
```

## Test Examples

### Frontend Component Test
```typescript
// apps/web/tests/unit/components/InstanceListItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { InstanceListItem } from '@/components/instances/InstanceListItem';
import { AuthContext } from '@/store/AuthContext';

const mockInstance = {
  instanceId: 'i-1234567890',
  instanceType: 't2.micro',
  state: 'running',
  publicIp: '1.2.3.4',
  privateIp: '10.0.0.1',
  launchTime: '2025-01-01T00:00:00Z',
  availabilityZone: 'us-east-1a',
  tags: { Name: 'Test Instance' }
};

describe('InstanceListItem', () => {
  it('displays instance information correctly', () => {
    render(
      <AuthContext.Provider value={{ user: { role: 'readonly' } }}>
        <InstanceListItem
          instance={mockInstance}
          onReboot={jest.fn()}
          onViewDetails={jest.fn()}
        />
      </AuthContext.Provider>
    );

    expect(screen.getByText('Test Instance')).toBeInTheDocument();
    expect(screen.getByText('t2.micro • us-east-1a')).toBeInTheDocument();
  });

  it('shows reboot button for admin users', () => {
    render(
      <AuthContext.Provider value={{ user: { role: 'admin' } }}>
        <InstanceListItem
          instance={mockInstance}
          onReboot={jest.fn()}
          onViewDetails={jest.fn()}
        />
      </AuthContext.Provider>
    );

    expect(screen.getByLabelText('Reboot instance')).toBeInTheDocument();
  });
});
```

### Backend API Test
```typescript
// apps/api/tests/integration/api/reboot.test.ts
import { handler } from '@/functions/instances/reboot';
import { EC2Client } from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';

const ec2Mock = mockClient(EC2Client);

describe('Reboot Instance Handler', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  it('successfully reboots instance for admin user', async () => {
    ec2Mock.on(RebootInstancesCommand).resolves({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'admin@example.com',
            'custom:role': 'admin'
          }
        }
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Instance reboot initiated successfully',
      instanceId: 'i-123'
    });
  });

  it('denies access for readonly users', async () => {
    const event = {
      pathParameters: { instanceId: 'i-123' },
      requestContext: {
        authorizer: {
          claims: {
            'custom:role': 'readonly'
          }
        }
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(403);
  });
});
```

### E2E Test
```typescript
// tests/e2e/specs/dashboard.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays instance list', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for instances to load
    await page.waitForSelector('[data-testid="instance-list"]');

    // Check that instances are displayed
    const instances = await page.locator('[data-testid="instance-item"]').count();
    expect(instances).toBeGreaterThan(0);
  });

  test('can filter instances by state', async ({ page }) => {
    await page.goto('/dashboard');

    // Apply filter
    await page.selectOption('[data-testid="state-filter"]', 'running');

    // Verify filtered results
    const states = await page.locator('[data-testid="instance-state"]').allTextContents();
    states.forEach(state => {
      expect(state).toBe('running');
    });
  });

  test('admin can reboot instance', async ({ page }) => {
    await page.goto('/dashboard');

    // Click reboot on first instance
    await page.locator('[data-testid="reboot-button"]').first().click();

    // Confirm in dialog
    await page.locator('button:has-text("Confirm")').click();

    // Check success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Reboot initiated');
  });
});
```
