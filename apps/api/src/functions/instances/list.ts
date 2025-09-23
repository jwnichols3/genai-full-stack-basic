import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { EC2Client, DescribeInstancesCommand, Instance, Tag } from '@aws-sdk/client-ec2';
import { randomUUID } from 'crypto';

interface EC2InstanceResponse {
  instanceId: string;
  instanceType: string;
  state: string;
  publicIp: string | null;
  privateIp: string;
  launchTime: string;
  availabilityZone: string;
  tags: Record<string, string>;
  monitoring?: {
    state: 'enabled' | 'disabled';
  };
}

interface ListInstancesResponse {
  instances: EC2InstanceResponse[];
}

interface UserContext {
  userId: string;
  email: string;
  role: 'admin' | 'readonly';
  correlationId: string;
}

const createResponse = (
  statusCode: number,
  data: ListInstancesResponse | { error: string; message: string },
  cacheControl?: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Request-Id',
    'X-Request-Id': randomUUID(),
    ...(cacheControl && { 'Cache-Control': cacheControl }),
  },
  body: JSON.stringify(data),
});

const getRegionFromQuery = (event: APIGatewayProxyEvent): string => {
  const queryRegion = event.queryStringParameters?.region;
  return queryRegion ?? 'us-east-1';
};

const formatTags = (tags: Tag[] | undefined): Record<string, string> => {
  if (!tags) return {};

  const formatted: Record<string, string> = {};
  tags.forEach((tag) => {
    if (tag.Key && tag.Value) {
      formatted[tag.Key] = tag.Value;
    }
  });

  return formatted;
};

const formatInstance = (instance: Instance): EC2InstanceResponse => {
  return {
    instanceId: instance.InstanceId ?? '',
    instanceType: instance.InstanceType ?? '',
    state: instance.State?.Name ?? 'unknown',
    publicIp: instance.PublicIpAddress ?? null,
    privateIp: instance.PrivateIpAddress ?? '',
    launchTime: instance.LaunchTime?.toISOString() ?? '',
    availabilityZone: instance.Placement?.AvailabilityZone ?? '',
    tags: formatTags(instance.Tags),
    monitoring: instance.Monitoring?.State
      ? {
          state: instance.Monitoring.State === 'enabled' ? 'enabled' : 'disabled',
        }
      : undefined,
  };
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const correlationId = randomUUID();

  // Extract user context from authorizer
  const userContext = event.requestContext.authorizer as unknown as UserContext;

  // eslint-disable-next-line no-console
  console.log('List instances request received', {
    requestId,
    correlationId,
    userId: userContext?.userId,
    path: event.path,
    queryParameters: event.queryStringParameters,
  });

  try {
    // Get region from query parameters
    const region = getRegionFromQuery(event);

    // Validate region format (basic validation)
    const regionRegex = /^[a-z]{2}-[a-z]+-\d{1}$/;
    if (!regionRegex.test(region)) {
      // eslint-disable-next-line no-console
      console.warn('Invalid region format', {
        requestId,
        correlationId,
        region,
        userId: userContext?.userId,
      });

      return createResponse(400, {
        error: 'INVALID_REGION',
        message: 'Invalid AWS region format',
      });
    }

    // Initialize EC2 client with specified region
    const ec2Client = new EC2Client({ region });

    // Collect all instances across all pages
    const allInstances: Instance[] = [];
    let nextToken: string | undefined;

    do {
      const command = new DescribeInstancesCommand({
        NextToken: nextToken,
        MaxResults: 100, // Reasonable page size
      });

      const response = await ec2Client.send(command);

      // Extract instances from reservations
      if (response.Reservations) {
        for (const reservation of response.Reservations) {
          if (reservation.Instances) {
            allInstances.push(...reservation.Instances);
          }
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    // Format instances for response
    const formattedInstances = allInstances.map(formatInstance);

    // eslint-disable-next-line no-console
    console.log('List instances successful', {
      requestId,
      correlationId,
      userId: userContext?.userId,
      region,
      instanceCount: formattedInstances.length,
    });

    return createResponse(
      200,
      { instances: formattedInstances },
      'max-age=300' // 5 minutes cache
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('List instances failed', {
      requestId,
      correlationId,
      userId: userContext?.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific AWS errors
    if (error instanceof Error) {
      if (error.name === 'UnauthorizedOperation') {
        return createResponse(403, {
          error: 'ACCESS_DENIED',
          message: 'Insufficient permissions to list EC2 instances',
        });
      }

      if (error.name === 'InvalidParameterValue') {
        return createResponse(400, {
          error: 'INVALID_PARAMETER',
          message: 'Invalid parameter value provided',
        });
      }
    }

    return createResponse(500, {
      error: 'INTERNAL_ERROR',
      message: 'Failed to list instances',
    });
  }
};
