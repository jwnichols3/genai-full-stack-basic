import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { EC2Client, DescribeInstancesCommand, Instance, Tag, SecurityGroup } from '@aws-sdk/client-ec2';
import { randomUUID } from 'crypto';

interface EC2InstanceDetailResponse {
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

interface UserContext {
  userId: string;
  email: string;
  role: 'admin' | 'readonly';
  correlationId: string;
}

const createResponse = (
  statusCode: number,
  data: EC2InstanceDetailResponse | { error: string; message: string },
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
  return queryRegion ?? 'us-west-2';
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

const formatSecurityGroups = (groups: SecurityGroup[] | undefined): Array<{
  groupId: string;
  groupName: string;
}> => {
  if (!groups) return [];

  return groups.map(group => ({
    groupId: group.GroupId ?? '',
    groupName: group.GroupName ?? '',
  }));
};

const formatInstanceDetail = (instance: Instance): EC2InstanceDetailResponse => {
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
    vpcId: instance.VpcId,
    subnetId: instance.SubnetId,
    securityGroups: formatSecurityGroups(instance.SecurityGroups),
    keyName: instance.KeyName,
    instanceProfile: instance.IamInstanceProfile
      ? {
          arn: instance.IamInstanceProfile.Arn ?? '',
          id: instance.IamInstanceProfile.Id ?? '',
        }
      : undefined,
  };
};

const validateInstanceId = (instanceId: string): boolean => {
  // EC2 instance ID format: i-xxxxxxxxxxxxxxxxx (17 characters after 'i-')
  const instanceIdRegex = /^i-[0-9a-f]{8,17}$/;
  return instanceIdRegex.test(instanceId);
};

const logAuditEvent = (
  action: string,
  userContext: UserContext,
  requestId: string,
  instanceId: string,
  success: boolean,
  error?: string
): void => {
  // eslint-disable-next-line no-console
  console.log('AUDIT_LOG', {
    action,
    userId: userContext.userId,
    userEmail: userContext.email,
    userRole: userContext.role,
    requestId,
    correlationId: userContext.correlationId,
    resourceType: 'EC2_INSTANCE',
    resourceId: instanceId,
    success,
    timestamp: new Date().toISOString(),
    ...(error && { error }),
  });
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const correlationId = randomUUID();

  // Extract instance ID from path parameters
  const instanceId = event.pathParameters?.instanceId;

  if (!instanceId) {
    return createResponse(400, {
      error: 'MISSING_PARAMETER',
      message: 'Instance ID is required',
    });
  }

  // Validate instance ID format
  if (!validateInstanceId(instanceId)) {
    return createResponse(400, {
      error: 'INVALID_INSTANCE_ID',
      message: 'Invalid EC2 instance ID format',
    });
  }

  // Extract user context from authorizer
  const userContext = event.requestContext.authorizer as unknown as UserContext;

  // eslint-disable-next-line no-console
  console.log('Get instance detail request received', {
    requestId,
    correlationId,
    userId: userContext?.userId,
    instanceId,
    path: event.path,
    queryParameters: event.queryStringParameters,
  });

  try {
    // Get region from query parameters
    const region = getRegionFromQuery(event);

    // eslint-disable-next-line no-console
    console.log('Region configuration details', {
      requestId,
      correlationId,
      userId: userContext?.userId,
      instanceId,
      queryRegion: event.queryStringParameters?.region,
      selectedRegion: region,
      defaultRegion: 'us-west-2',
    });

    // Validate region format (basic validation)
    const regionRegex = /^[a-z]{2}-[a-z]+-\d{1}$/;
    if (!regionRegex.test(region)) {
      // eslint-disable-next-line no-console
      console.warn('Invalid region format', {
        requestId,
        correlationId,
        region,
        userId: userContext?.userId,
        instanceId,
      });

      return createResponse(400, {
        error: 'INVALID_REGION',
        message: 'Invalid AWS region format',
      });
    }

    // Initialize EC2 client with specified region
    const ec2Client = new EC2Client({ region });

    // eslint-disable-next-line no-console
    console.log('EC2 client initialized', {
      requestId,
      correlationId,
      region,
      instanceId,
    });

    // Get specific instance details
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    });

    const response = await ec2Client.send(command);

    // Check if instance exists
    if (!response.Reservations || response.Reservations.length === 0) {
      logAuditEvent(
        'VIEW_INSTANCE',
        userContext,
        requestId,
        instanceId,
        false,
        'Instance not found'
      );

      return createResponse(404, {
        error: 'INSTANCE_NOT_FOUND',
        message: `Instance ${instanceId} not found`,
      });
    }

    // Extract the instance from the first reservation
    const reservation = response.Reservations[0];
    if (!reservation.Instances || reservation.Instances.length === 0) {
      logAuditEvent(
        'VIEW_INSTANCE',
        userContext,
        requestId,
        instanceId,
        false,
        'Instance not found in reservation'
      );

      return createResponse(404, {
        error: 'INSTANCE_NOT_FOUND',
        message: `Instance ${instanceId} not found`,
      });
    }

    const instance = reservation.Instances[0];
    const formattedInstance = formatInstanceDetail(instance);

    // Log successful audit event
    logAuditEvent('VIEW_INSTANCE', userContext, requestId, instanceId, true);

    // eslint-disable-next-line no-console
    console.log('Get instance detail successful', {
      requestId,
      correlationId,
      userId: userContext?.userId,
      instanceId,
      region,
      instanceState: formattedInstance.state,
    });

    return createResponse(
      200,
      formattedInstance,
      'max-age=300' // 5 minutes cache
    );
  } catch (error) {
    logAuditEvent(
      'VIEW_INSTANCE',
      userContext,
      requestId,
      instanceId,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // eslint-disable-next-line no-console
    console.error('Get instance detail failed', {
      requestId,
      correlationId,
      userId: userContext?.userId,
      instanceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific AWS errors
    if (error instanceof Error) {
      if (error.name === 'UnauthorizedOperation') {
        return createResponse(403, {
          error: 'ACCESS_DENIED',
          message: 'Insufficient permissions to view EC2 instance details',
        });
      }

      if (error.name === 'InvalidParameterValue') {
        return createResponse(400, {
          error: 'INVALID_PARAMETER',
          message: 'Invalid parameter value provided',
        });
      }

      if (error.name === 'InvalidInstanceID.NotFound') {
        return createResponse(404, {
          error: 'INSTANCE_NOT_FOUND',
          message: `Instance ${instanceId} not found`,
        });
      }
    }

    return createResponse(500, {
      error: 'INTERNAL_ERROR',
      message: 'Failed to get instance details',
    });
  }
};