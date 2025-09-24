export interface TestInstance {
  instanceId: string;
  name: string;
  type: string;
  state: 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated';
  region: string;
  publicIp?: string;
  privateIp?: string;
  launchTime: string;
}

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'user' | 'readonly';
  firstName?: string;
  lastName?: string;
}

export interface TestCredentials {
  valid: TestUser;
  invalid: TestUser;
  locked: TestUser;
  expired: TestUser;
}

export class TestDataFactory {
  private static instanceCounter = 0;
  private static userCounter = 0;

  static createTestInstance(overrides?: Partial<TestInstance>): TestInstance {
    this.instanceCounter++;
    const baseInstance: TestInstance = {
      instanceId: `i-${this.generateId()}`,
      name: `test-instance-${this.instanceCounter}`,
      type: 't2.micro',
      state: 'running',
      region: 'us-west-2',
      publicIp: `54.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}`,
      privateIp: `172.31.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}`,
      launchTime: new Date().toISOString(),
    };

    return { ...baseInstance, ...overrides };
  }

  static createTestInstances(count: number, overrides?: Partial<TestInstance>): TestInstance[] {
    const instances: TestInstance[] = [];
    const states: TestInstance['state'][] = ['running', 'stopped', 'running', 'pending', 'running'];
    const types = ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small'];
    const regions = ['us-west-2', 'us-east-1', 'eu-west-1', 'ap-southeast-1'];

    for (let i = 0; i < count; i++) {
      instances.push(
        this.createTestInstance({
          name: `test-instance-${i + 1}`,
          state: states[i % states.length],
          type: types[i % types.length],
          region: regions[i % regions.length],
          ...overrides,
        })
      );
    }

    return instances;
  }

  static createTestUser(overrides?: Partial<TestUser>): TestUser {
    this.userCounter++;
    const baseUser: TestUser = {
      email: `test.user${this.userCounter}@example.com`,
      password: `TestPass${this.userCounter}!@#`,
      role: 'user',
      firstName: `Test${this.userCounter}`,
      lastName: 'User',
    };

    return { ...baseUser, ...overrides };
  }

  static createTestCredentials(): TestCredentials {
    return {
      valid: {
        email: 'test@example.com',
        password: 'Test123!@#',
        role: 'admin',
      },
      invalid: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
        role: 'user',
      },
      locked: {
        email: 'locked@example.com',
        password: 'Locked123!@#',
        role: 'user',
      },
      expired: {
        email: 'expired@example.com',
        password: 'Expired123!@#',
        role: 'user',
      },
    };
  }

  static createLoginTestCases() {
    return [
      {
        name: 'Valid credentials',
        email: 'test@example.com',
        password: 'Test123!@#',
        shouldSucceed: true,
      },
      {
        name: 'Invalid email',
        email: 'invalid@example.com',
        password: 'Test123!@#',
        shouldSucceed: false,
        expectedError: 'Invalid credentials',
      },
      {
        name: 'Invalid password',
        email: 'test@example.com',
        password: 'wrongpassword',
        shouldSucceed: false,
        expectedError: 'Invalid credentials',
      },
      {
        name: 'Empty email',
        email: '',
        password: 'Test123!@#',
        shouldSucceed: false,
        expectedError: 'Email is required',
      },
      {
        name: 'Empty password',
        email: 'test@example.com',
        password: '',
        shouldSucceed: false,
        expectedError: 'Password is required',
      },
      {
        name: 'Invalid email format',
        email: 'notanemail',
        password: 'Test123!@#',
        shouldSucceed: false,
        expectedError: 'Invalid email format',
      },
      {
        name: 'SQL injection attempt',
        email: "admin' OR '1'='1",
        password: "password' OR '1'='1",
        shouldSucceed: false,
        expectedError: 'Invalid credentials',
      },
      {
        name: 'XSS attempt',
        email: '<script>alert("xss")</script>',
        password: 'Test123!@#',
        shouldSucceed: false,
        expectedError: 'Invalid email format',
      },
    ];
  }

  static createInstanceActionTestCases() {
    return [
      {
        action: 'start',
        initialState: 'stopped',
        expectedState: 'running',
        expectedMessage: 'Instance started successfully',
      },
      {
        action: 'stop',
        initialState: 'running',
        expectedState: 'stopped',
        expectedMessage: 'Instance stopped successfully',
      },
      {
        action: 'reboot',
        initialState: 'running',
        expectedState: 'running',
        expectedMessage: 'Instance rebooted successfully',
      },
      {
        action: 'terminate',
        initialState: 'stopped',
        expectedState: 'terminated',
        expectedMessage: 'Instance terminated successfully',
      },
    ];
  }

  static createErrorScenarios() {
    return [
      {
        name: 'Network timeout',
        type: 'timeout',
        delay: 30000,
        expectedMessage: 'Request timed out',
      },
      {
        name: 'Server error',
        type: 'server',
        statusCode: 500,
        expectedMessage: 'Internal server error',
      },
      {
        name: 'Unauthorized',
        type: 'auth',
        statusCode: 401,
        expectedMessage: 'Authentication required',
      },
      {
        name: 'Forbidden',
        type: 'auth',
        statusCode: 403,
        expectedMessage: 'Access denied',
      },
      {
        name: 'Not found',
        type: 'client',
        statusCode: 404,
        expectedMessage: 'Resource not found',
      },
      {
        name: 'Rate limited',
        type: 'client',
        statusCode: 429,
        expectedMessage: 'Too many requests',
      },
    ];
  }

  static createPerformanceTargets() {
    return {
      login: {
        target: 2000,
        acceptable: 3000,
        description: 'Login flow completion',
      },
      dashboardLoad: {
        target: 3000,
        acceptable: 5000,
        description: 'Dashboard initial load',
      },
      instanceList: {
        target: 1500,
        acceptable: 2500,
        description: 'Instance list render',
      },
      instanceAction: {
        target: 5000,
        acceptable: 8000,
        description: 'Instance state change',
      },
      pageTransition: {
        target: 1000,
        acceptable: 1500,
        description: 'Page navigation',
      },
    };
  }

  static createViewportSizes() {
    return {
      desktop: { width: 1920, height: 1080, name: 'Desktop HD' },
      laptop: { width: 1366, height: 768, name: 'Laptop' },
      tablet: { width: 768, height: 1024, name: 'Tablet' },
      mobile: { width: 375, height: 667, name: 'Mobile' },
      mobileSmall: { width: 320, height: 568, name: 'Mobile Small' },
    };
  }

  static createAccessibilityTestCases() {
    return [
      { element: 'button', requirement: 'All buttons must have accessible labels' },
      { element: 'form', requirement: 'All form inputs must have associated labels' },
      { element: 'image', requirement: 'All images must have alt text' },
      { element: 'link', requirement: 'All links must have descriptive text' },
      { element: 'heading', requirement: 'Headings must be in hierarchical order' },
      { element: 'contrast', requirement: 'Text must have 4.5:1 contrast ratio' },
      { element: 'focus', requirement: 'All interactive elements must have focus indicators' },
      { element: 'keyboard', requirement: 'All functionality must be keyboard accessible' },
    ];
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static cleanupTestData(): void {
    this.instanceCounter = 0;
    this.userCounter = 0;
  }
}

export default TestDataFactory;
