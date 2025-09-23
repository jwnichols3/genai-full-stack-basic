import { APIGatewayTokenAuthorizerEvent, Context } from 'aws-lambda';
import { handler } from '../../../../src/functions/auth/authorizer';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const authorizerModule = require('../../../../src/functions/auth/authorizer');

// Mock aws-jwt-verify
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn(),
    }),
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-correlation-id-123'),
}));

describe('Lambda Authorizer Function', () => {
  let mockVerifier: any;
  let mockEvent: APIGatewayTokenAuthorizerEvent;
  let mockContext: Context;

  beforeEach(() => {
    // Setup environment variables
    process.env.COGNITO_USER_POOL_ID = 'us-west-2_testpool123';
    process.env.COGNITO_CLIENT_ID = 'test-client-id-456';

    // Setup mock verifier
    mockVerifier = {
      verify: jest.fn(),
    };
    (CognitoJwtVerifier.create as jest.Mock).mockReturnValue(mockVerifier);

    // Reset verifier instance for each test
    authorizerModule.verifier = undefined;

    // Setup mock event
    mockEvent = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:us-west-2:123456789012:abcdef123/dev/GET/api/v1/instances',
      authorizationToken: 'Bearer valid-jwt-token',
    };

    // Setup mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-authorizer',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:test-authorizer',
      memoryLimitInMB: '256',
      awsRequestId: 'test-request-id-789',
      logGroupName: '/aws/lambda/test-authorizer',
      logStreamName: '2025/09/15/[$LATEST]test123',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;
  });

  describe('Valid JWT Token Scenarios', () => {
    test('should return Allow policy for valid admin user', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'admin@example.com',
        'custom:role': 'admin' as const,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const result = await handler(mockEvent, mockContext);

      expect(result).toEqual({
        principalId: 'user123',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: mockEvent.methodArn,
            },
          ],
        },
        context: {
          userId: 'user123',
          email: 'admin@example.com',
          role: 'admin',
          correlationId: 'test-correlation-id-123',
        },
      });
    });

    test('should return Allow policy for valid readonly user', async () => {
      const mockPayload = {
        sub: 'user456',
        email: 'readonly@example.com',
        'custom:role': 'readonly' as const,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const result = await handler(mockEvent, mockContext);

      expect(result).toEqual({
        principalId: 'user456',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: mockEvent.methodArn,
            },
          ],
        },
        context: {
          userId: 'user456',
          email: 'readonly@example.com',
          role: 'readonly',
          correlationId: 'test-correlation-id-123',
        },
      });
    });
  });

  describe('Invalid Token Scenarios', () => {
    test('should throw Unauthorized for expired JWT token', async () => {
      const expiredTokenError = new Error('Token expired');
      expiredTokenError.name = 'JwtExpiredError';
      mockVerifier.verify.mockRejectedValue(expiredTokenError);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for invalid JWT signature', async () => {
      const invalidSignatureError = new Error('Invalid signature');
      invalidSignatureError.name = 'JwtInvalidSignatureError';
      mockVerifier.verify.mockRejectedValue(invalidSignatureError);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for malformed token', async () => {
      const malformedTokenError = new Error('Malformed token');
      malformedTokenError.name = 'JwtMalformedError';
      mockVerifier.verify.mockRejectedValue(malformedTokenError);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for missing Authorization header', async () => {
      const eventWithoutAuth = {
        ...mockEvent,
        authorizationToken: '',
      };

      await expect(handler(eventWithoutAuth, mockContext)).rejects.toThrow('Unauthorized');
      expect(mockVerifier.verify).not.toHaveBeenCalled();
    });

    test('should throw Unauthorized for invalid Bearer format', async () => {
      const eventWithInvalidBearer = {
        ...mockEvent,
        authorizationToken: 'InvalidFormat token123',
      };

      await expect(handler(eventWithInvalidBearer, mockContext)).rejects.toThrow('Unauthorized');
      expect(mockVerifier.verify).not.toHaveBeenCalled();
    });

    test('should throw Unauthorized for missing Bearer prefix', async () => {
      const eventWithoutBearer = {
        ...mockEvent,
        authorizationToken: 'just-a-token-without-bearer',
      };

      await expect(handler(eventWithoutBearer, mockContext)).rejects.toThrow('Unauthorized');
      expect(mockVerifier.verify).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Claims Scenarios', () => {
    test('should throw Unauthorized for missing sub claim', async () => {
      const mockPayload = {
        email: 'user@example.com',
        'custom:role': 'admin' as const,
        // sub missing
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for missing email claim', async () => {
      const mockPayload = {
        sub: 'user123',
        'custom:role': 'admin' as const,
        // email missing
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for missing custom:role claim', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'user@example.com',
        // custom:role missing
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized for invalid role value', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'user@example.com',
        'custom:role': 'invalid-role' as any,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Configuration and Environment', () => {
    test('should throw Unauthorized error for missing COGNITO_USER_POOL_ID', async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized error for missing COGNITO_CLIENT_ID', async () => {
      delete process.env.COGNITO_CLIENT_ID;

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });

    test('should throw Unauthorized error for missing both environment variables', async () => {
      delete process.env.COGNITO_USER_POOL_ID;
      delete process.env.COGNITO_CLIENT_ID;

      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Correlation ID and Context', () => {
    test('should include correlation ID in user context', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'admin@example.com',
        'custom:role': 'admin' as const,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const result = await handler(mockEvent, mockContext);

      expect(result.context).toEqual({
        userId: 'user123',
        email: 'admin@example.com',
        role: 'admin',
        correlationId: 'test-correlation-id-123',
      });
    });

    test('should create CognitoJwtVerifier with correct configuration', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'admin@example.com',
        'custom:role': 'admin' as const,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await handler(mockEvent, mockContext);

      expect(CognitoJwtVerifier.create).toHaveBeenCalledWith({
        userPoolId: 'us-west-2_testpool123',
        tokenUse: 'access',
        clientId: 'test-client-id-456',
      });
    });

    test('should call verify with extracted token', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'admin@example.com',
        'custom:role': 'admin' as const,
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      await handler(mockEvent, mockContext);

      expect(mockVerifier.verify).toHaveBeenCalledWith('valid-jwt-token');
    });
  });

  describe('Error Response Format', () => {
    test('should always throw generic Unauthorized error for security', async () => {
      // Test various error types all return the same generic error
      const errorTypes = [
        new Error('Token expired'),
        new Error('Invalid signature'),
        new Error('Network error'),
        new Error('Unknown error'),
      ];

      for (const error of errorTypes) {
        mockVerifier.verify.mockRejectedValue(error);

        await expect(handler(mockEvent, mockContext)).rejects.toThrow('Unauthorized');
      }
    });
  });
});
