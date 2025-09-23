import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, Context } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { randomUUID } from 'crypto';

interface AuthorizerConfig {
  userPoolId: string;
  clientId: string;
}

interface JWTPayload {
  sub: string;
  email: string;
  'custom:role': 'admin' | 'readonly';
}

const getConfig = (): AuthorizerConfig => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error(
      'Missing required environment variables: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID'
    );
  }

  return {
    userPoolId,
    clientId,
  };
};

export let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

const generateAllowPolicy = (
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: resource,
      },
    ],
  },
});

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  const correlationId = randomUUID();
  const requestId = context.awsRequestId;

  // eslint-disable-next-line no-console
  console.log('Authorization request:', {
    correlationId,
    requestId,
    methodArn: event.methodArn,
  });

  try {
    const config = getConfig();

    // Initialize verifier with config
    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId: config.userPoolId,
        tokenUse: 'id', // Change from 'access' to 'id' since we need user claims
        clientId: config.clientId,
      });
    }

    // Extract token from authorization header
    if (!event.authorizationToken || !event.authorizationToken.startsWith('Bearer ')) {
      // eslint-disable-next-line no-console
      console.warn('Authorization failed: Missing or invalid token format', {
        correlationId,
        requestId,
        reason: 'missing_bearer_token',
        authorizationToken: event.authorizationToken || 'undefined',
      });
      throw new Error('Unauthorized');
    }

    const token = event.authorizationToken.substring(7); // Remove 'Bearer ' prefix

    // eslint-disable-next-line no-console
    console.log('Token received for verification', {
      correlationId,
      requestId,
      tokenLength: token.length,
      tokenParts: token.split('.').length,
      tokenPrefix: token.substring(0, 50),
      tokenSuffix: token.length > 50 ? token.substring(token.length - 20) : 'N/A',
    });

    // Verify JWT token with Cognito
    if (!verifier) {
      throw new Error('Verifier not initialized');
    }
    const payload = (await verifier.verify(token)) as unknown as JWTPayload;

    // Extract user information from JWT claims
    const userId = payload.sub;
    const email = payload.email;
    const role = payload['custom:role'];

    if (!userId || !email || !role) {
      // eslint-disable-next-line no-console
      console.warn('Authorization failed: Missing required claims', {
        correlationId,
        requestId,
        userId: userId || 'missing',
        email: email || 'missing',
        role: role || 'missing',
      });
      throw new Error('Unauthorized');
    }

    // Validate role is one of the expected values
    if (role !== 'admin' && role !== 'readonly') {
      // eslint-disable-next-line no-console
      console.warn('Authorization failed: Invalid role', {
        correlationId,
        requestId,
        userId,
        email,
        role,
      });
      throw new Error('Unauthorized');
    }

    // Generate allow policy with user context
    const policy = generateAllowPolicy(userId, event.methodArn);
    policy.context = {
      userId,
      email,
      role,
      correlationId,
    };

    // eslint-disable-next-line no-console
    console.log('Authorization successful', {
      correlationId,
      requestId,
      userId,
      email,
      role,
      methodArn: event.methodArn,
    });

    return policy;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Authorization failed', {
      correlationId,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      methodArn: event.methodArn,
    });

    // For security reasons, always return a generic Unauthorized error
    // The specific error details are logged but not exposed to the client
    throw new Error('Unauthorized');
  }
};
