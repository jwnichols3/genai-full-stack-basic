import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../../../../src/functions/instances/list';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: jest.fn(),
  DescribeInstancesCommand: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-correlation-id-123'),
}));

describe('List Instances Lambda Function', () => {
  let mockEC2Client: any;
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockEC2Client = {
      send: jest.fn(),
    };
    (EC2Client as jest.Mock).mockImplementation(() => mockEC2Client);

    // Setup mock event
    mockEvent = {
      httpMethod: 'GET',
      path: '/api/v1/instances',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      pathParameters: null,
      queryStringParameters: null,
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'dev',
        httpMethod: 'GET',
        path: '/api/v1/instances',
        protocol: 'HTTP/1.1',
        resourcePath: '/instances',
        requestTime: '09/Sep/2025:12:00:00 +0000',
        requestTimeEpoch: 1725264000000,
        identity: {
          sourceIp: '192.168.1.1',
          userAgent: 'test-agent',
        },
        authorizer: {
          userId: 'test-user-123',
          email: 'test@example.com',
          role: 'admin',
          correlationId: 'auth-correlation-id',
        },
      } as any,
      resource: '/instances',
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    };

    // Setup mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'ec2-manager-list-instances-dev',
      functionVersion: '$LATEST',
      invokedFunctionArn:
        'arn:aws:lambda:us-west-2:123456789012:function:ec2-manager-list-instances-dev',
      memoryLimitInMB: '512',
      awsRequestId: 'test-request-id-789',
      logGroupName: '/aws/lambda/ec2-manager-list-instances-dev',
      logStreamName: '2025/09/15/[$LATEST]test123',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Successful Instance Retrieval', () => {
    test('should return formatted instance list for successful API call', async () => {
      const mockInstances = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-1234567890abcdef0',
                InstanceType: 't2.micro',
                State: { Name: 'running' },
                PublicIpAddress: '203.0.113.1',
                PrivateIpAddress: '10.0.0.1',
                LaunchTime: new Date('2025-09-15T12:00:00Z'),
                Placement: { AvailabilityZone: 'us-east-1a' },
                Tags: [
                  { Key: 'Name', Value: 'MyInstance' },
                  { Key: 'Environment', Value: 'dev' },
                ],
                Monitoring: { State: 'enabled' },
              },
              {
                InstanceId: 'i-abcdef1234567890',
                InstanceType: 't3.small',
                State: { Name: 'stopped' },
                PublicIpAddress: undefined,
                PrivateIpAddress: '10.0.0.2',
                LaunchTime: new Date('2025-09-14T10:00:00Z'),
                Placement: { AvailabilityZone: 'us-east-1b' },
                Tags: [{ Key: 'Name', Value: 'TestInstance' }],
                Monitoring: { State: 'disabled' },
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValue(mockInstances);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['Cache-Control']).toBe('max-age=300');

      const responseBody = JSON.parse(result.body);
      expect(responseBody.instances).toHaveLength(2);

      // Verify first instance formatting
      expect(responseBody.instances[0]).toEqual({
        instanceId: 'i-1234567890abcdef0',
        instanceType: 't2.micro',
        state: 'running',
        publicIp: '203.0.113.1',
        privateIp: '10.0.0.1',
        launchTime: '2025-09-15T12:00:00.000Z',
        availabilityZone: 'us-east-1a',
        tags: {
          Name: 'MyInstance',
          Environment: 'dev',
        },
        monitoring: {
          state: 'enabled',
        },
      });

      // Verify second instance formatting (no public IP)
      expect(responseBody.instances[1]).toEqual({
        instanceId: 'i-abcdef1234567890',
        instanceType: 't3.small',
        state: 'stopped',
        publicIp: null,
        privateIp: '10.0.0.2',
        launchTime: '2025-09-14T10:00:00.000Z',
        availabilityZone: 'us-east-1b',
        tags: {
          Name: 'TestInstance',
        },
        monitoring: {
          state: 'disabled',
        },
      });
    });

    test('should return empty array for no instances', async () => {
      const mockEmptyInstances = {
        Reservations: [],
      };

      mockEC2Client.send.mockResolvedValue(mockEmptyInstances);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.instances).toEqual([]);
    });

    test('should handle instances with missing optional fields', async () => {
      const mockInstances = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-minimal',
                InstanceType: 't2.nano',
                State: { Name: 'pending' },
                // Missing optional fields
                PrivateIpAddress: '10.0.0.3',
                LaunchTime: new Date('2025-09-15T15:00:00Z'),
                Placement: { AvailabilityZone: 'us-east-1c' },
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValue(mockInstances);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.instances[0]).toEqual({
        instanceId: 'i-minimal',
        instanceType: 't2.nano',
        state: 'pending',
        publicIp: null,
        privateIp: '10.0.0.3',
        launchTime: '2025-09-15T15:00:00.000Z',
        availabilityZone: 'us-east-1c',
        tags: {},
      });
    });
  });

  describe('Pagination Handling', () => {
    test('should handle paginated responses correctly', async () => {
      // First page
      const firstPageResponse = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-page1-instance1',
                InstanceType: 't2.micro',
                State: { Name: 'running' },
                PrivateIpAddress: '10.0.0.1',
                LaunchTime: new Date('2025-09-15T12:00:00Z'),
                Placement: { AvailabilityZone: 'us-east-1a' },
                Tags: [],
              },
            ],
          },
        ],
        NextToken: 'next-page-token',
      };

      // Second page
      const secondPageResponse = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-page2-instance1',
                InstanceType: 't3.small',
                State: { Name: 'stopped' },
                PrivateIpAddress: '10.0.0.2',
                LaunchTime: new Date('2025-09-15T13:00:00Z'),
                Placement: { AvailabilityZone: 'us-east-1b' },
                Tags: [],
              },
            ],
          },
        ],
        // No NextToken indicates last page
      };

      mockEC2Client.send
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.instances).toHaveLength(2);
      expect(responseBody.instances[0].instanceId).toBe('i-page1-instance1');
      expect(responseBody.instances[1].instanceId).toBe('i-page2-instance1');

      // Verify pagination calls
      expect(mockEC2Client.send).toHaveBeenCalledTimes(2);
      expect(DescribeInstancesCommand).toHaveBeenNthCalledWith(1, {
        NextToken: undefined,
        MaxResults: 100,
      });
      expect(DescribeInstancesCommand).toHaveBeenNthCalledWith(2, {
        NextToken: 'next-page-token',
        MaxResults: 100,
      });
    });
  });

  describe('Region Parameter Handling', () => {
    test('should use default region when no region parameter provided', async () => {
      mockEC2Client.send.mockResolvedValue({ Reservations: [] });

      await handler(mockEvent, mockContext);

      expect(EC2Client).toHaveBeenCalledWith({ region: 'us-east-1' });
    });

    test('should use region from query parameter', async () => {
      const eventWithRegion = {
        ...mockEvent,
        queryStringParameters: { region: 'us-west-2' },
      };

      mockEC2Client.send.mockResolvedValue({ Reservations: [] });

      await handler(eventWithRegion, mockContext);

      expect(EC2Client).toHaveBeenCalledWith({ region: 'us-west-2' });
    });

    test('should return 400 for invalid region format', async () => {
      const eventWithInvalidRegion = {
        ...mockEvent,
        queryStringParameters: { region: 'invalid-region' },
      };

      const result = await handler(eventWithInvalidRegion, mockContext);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('INVALID_REGION');
      expect(responseBody.message).toBe('Invalid AWS region format');
      expect(mockEC2Client.send).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should return 403 for UnauthorizedOperation error', async () => {
      const unauthorizedError = new Error('Access denied');
      unauthorizedError.name = 'UnauthorizedOperation';
      mockEC2Client.send.mockRejectedValue(unauthorizedError);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('ACCESS_DENIED');
      expect(responseBody.message).toBe('Insufficient permissions to list EC2 instances');
    });

    test('should return 400 for InvalidParameterValue error', async () => {
      const invalidParamError = new Error('Invalid parameter');
      invalidParamError.name = 'InvalidParameterValue';
      mockEC2Client.send.mockRejectedValue(invalidParamError);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('INVALID_PARAMETER');
      expect(responseBody.message).toBe('Invalid parameter value provided');
    });

    test('should return 500 for generic AWS API error', async () => {
      const genericError = new Error('Service unavailable');
      mockEC2Client.send.mockRejectedValue(genericError);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('INTERNAL_ERROR');
      expect(responseBody.message).toBe('Failed to list instances');
    });

    test('should return 500 for unknown error type', async () => {
      mockEC2Client.send.mockRejectedValue('String error');

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('INTERNAL_ERROR');
      expect(responseBody.message).toBe('Failed to list instances');
    });
  });

  describe('Response Format and Headers', () => {
    test('should include correct CORS headers', async () => {
      mockEC2Client.send.mockResolvedValue({ Reservations: [] });

      const result = await handler(mockEvent, mockContext);

      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Authorization, Content-Type, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Expose-Headers': 'X-Request-Id',
        'Cache-Control': 'max-age=300',
      });
      expect(result.headers!['X-Request-Id']).toBe('test-correlation-id-123');
    });

    test('should not include cache headers for error responses', async () => {
      const error = new Error('Test error');
      mockEC2Client.send.mockRejectedValue(error);

      const result = await handler(mockEvent, mockContext);

      expect(result.headers!['Cache-Control']).toBeUndefined();
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Logging', () => {
    test('should log request received with correlation info', async () => {
      mockEC2Client.send.mockResolvedValue({ Reservations: [] });

      await handler(mockEvent, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith('List instances request received', {
        requestId: 'test-request-id-789',
        correlationId: 'test-correlation-id-123',
        userId: 'test-user-123',
        path: '/api/v1/instances',
        queryParameters: null,
      });
    });

    test('should log successful completion with instance count', async () => {
      const mockInstances = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-123',
                InstanceType: 't2.micro',
                State: { Name: 'running' },
                PrivateIpAddress: '10.0.0.1',
                LaunchTime: new Date(),
                Placement: { AvailabilityZone: 'us-east-1a' },
                Tags: [],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValue(mockInstances);

      await handler(mockEvent, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith('List instances successful', {
        requestId: 'test-request-id-789',
        correlationId: 'test-correlation-id-123',
        userId: 'test-user-123',
        region: 'us-east-1',
        instanceCount: 1,
      });
    });

    test('should log errors with correlation info', async () => {
      const error = new Error('Test error');
      mockEC2Client.send.mockRejectedValue(error);

      await handler(mockEvent, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('List instances failed', {
        requestId: 'test-request-id-789',
        correlationId: 'test-correlation-id-123',
        userId: 'test-user-123',
        error: 'Test error',
        stack: error.stack,
      });
    });

    test('should log warning for invalid region', async () => {
      const eventWithInvalidRegion = {
        ...mockEvent,
        queryStringParameters: { region: 'invalid' },
      };

      await handler(eventWithInvalidRegion, mockContext);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid region format', {
        requestId: 'test-request-id-789',
        correlationId: 'test-correlation-id-123',
        region: 'invalid',
        userId: 'test-user-123',
      });
    });
  });
});
