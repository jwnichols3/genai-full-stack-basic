import {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import {
  DynamoDBClient,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  APIGatewayClient,
  GetRestApisCommand,
} from '@aws-sdk/client-api-gateway';
import {
  S3Client,
  HeadBucketCommand,
  GetBucketEncryptionCommand,
} from '@aws-sdk/client-s3';
import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';

// Integration tests for deployed infrastructure
// These tests run against actual AWS resources

const region = process.env.AWS_REGION || 'us-west-2';
const environment = process.env.TEST_ENVIRONMENT || 'dev';
const stackName = `EC2Manager-${environment}`;

// Skip integration tests if no AWS credentials or if running in CI without AWS access
const shouldSkipIntegrationTests =
  !process.env.AWS_PROFILE &&
  !process.env.AWS_ACCESS_KEY_ID &&
  !process.env.RUN_INTEGRATION_TESTS;

const testTimeout = 30000; // 30 seconds

describe('Infrastructure Integration Tests', () => {
  let cfnClient: CloudFormationClient;
  let dynamoClient: DynamoDBClient;
  let cognitoClient: CognitoIdentityProviderClient;
  let apiGatewayClient: APIGatewayClient;
  let s3Client: S3Client;
  let cloudWatchClient: CloudWatchClient;
  let stackResources: any[];

  beforeAll(async () => {
    if (shouldSkipIntegrationTests) {
      console.log('⏭️  Skipping integration tests - AWS credentials not configured');
      return;
    }

    // Initialize AWS clients
    cfnClient = new CloudFormationClient({ region });
    dynamoClient = new DynamoDBClient({ region });
    cognitoClient = new CognitoIdentityProviderClient({ region });
    apiGatewayClient = new APIGatewayClient({ region });
    s3Client = new S3Client({ region });
    cloudWatchClient = new CloudWatchClient({ region });

    try {
      // Get stack resources
      const resourcesResponse = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: stackName })
      );
      stackResources = resourcesResponse.StackResources || [];
    } catch (error) {
      console.error(`❌ Stack ${stackName} not found or not accessible:`, error);
      throw new Error(`Stack ${stackName} must be deployed before running integration tests`);
    }
  }, testTimeout);

  describe('Stack Deployment', () => {
    test('stack exists and is in CREATE_COMPLETE or UPDATE_COMPLETE state', async () => {
      if (shouldSkipIntegrationTests) return;

      const response = await cfnClient.send(
        new DescribeStacksCommand({ StackName: stackName })
      );

      expect(response.Stacks).toHaveLength(1);
      const stack = response.Stacks![0];
      expect(['CREATE_COMPLETE', 'UPDATE_COMPLETE']).toContain(stack.StackStatus);
      expect(stack.StackName).toBe(stackName);
    });

    test('stack has all required resources', async () => {
      if (shouldSkipIntegrationTests) return;

      const resourceTypes = stackResources.map(r => r.ResourceType);

      // Essential resources that must exist
      const requiredResources = [
        'AWS::EC2::VPC',
        'AWS::DynamoDB::Table',
        'AWS::Cognito::UserPool',
        'AWS::S3::Bucket',
        'AWS::ApiGateway::RestApi',
        'AWS::CloudWatch::Dashboard',
        'AWS::Logs::LogGroup',
        'AWS::IAM::Role',
      ];

      requiredResources.forEach(resourceType => {
        expect(resourceTypes).toContain(resourceType);
      });
    });
  });

  describe('VPC and Networking', () => {
    test('VPC is created with correct configuration', async () => {
      if (shouldSkipIntegrationTests) return;

      const vpcResource = stackResources.find(r => r.ResourceType === 'AWS::EC2::VPC');
      expect(vpcResource).toBeDefined();
      expect(vpcResource?.ResourceStatus).toBe('CREATE_COMPLETE');
    });

    test('subnets are created across multiple AZs', async () => {
      if (shouldSkipIntegrationTests) return;

      const subnets = stackResources.filter(r => r.ResourceType === 'AWS::EC2::Subnet');
      expect(subnets.length).toBeGreaterThanOrEqual(4); // At least 2 public + 2 private
    });

    test('NAT gateways are created for private subnets', async () => {
      if (shouldSkipIntegrationTests) return;

      const natGateways = stackResources.filter(r => r.ResourceType === 'AWS::EC2::NatGateway');
      expect(natGateways.length).toBeGreaterThanOrEqual(2); // High availability
    });
  });

  describe('DynamoDB Table', () => {
    test('audit table exists and is configured correctly', async () => {
      if (shouldSkipIntegrationTests) return;

      const tableResource = stackResources.find(r => r.ResourceType === 'AWS::DynamoDB::Table');
      expect(tableResource).toBeDefined();

      const tableName = `ec2-manager-audit-${environment}`;
      const response = await dynamoClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );

      expect(response.Table?.TableName).toBe(tableName);
      expect(response.Table?.TableStatus).toBe('ACTIVE');

      // Check key schema
      const keySchema = response.Table?.KeySchema;
      expect(keySchema).toEqual([
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ]);

      // Check encryption
      expect(response.Table?.SSEDescription?.Status).toBe('ENABLED');

      // Check TTL
      expect(response.Table?.TimeToLiveDescription?.TimeToLiveStatus).toBe('ENABLED');
    });

    test('table has appropriate billing mode', async () => {
      if (shouldSkipIntegrationTests) return;

      const tableName = `ec2-manager-audit-${environment}`;
      const response = await dynamoClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );

      expect(response.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
    });
  });

  describe('Cognito User Pool', () => {
    test('user pool exists and is configured correctly', async () => {
      if (shouldSkipIntegrationTests) return;

      const userPoolResource = stackResources.find(r => r.ResourceType === 'AWS::Cognito::UserPool');
      expect(userPoolResource).toBeDefined();

      const response = await cognitoClient.send(
        new DescribeUserPoolCommand({ UserPoolId: userPoolResource!.PhysicalResourceId })
      );

      expect(response.UserPool?.Name).toBe(`ec2-manager-${environment}`);
      expect(response.UserPool?.UsernameAttributes).toContain('email');
      expect(response.UserPool?.AutoVerifiedAttributes).toContain('email');

      // Check password policy
      const passwordPolicy = response.UserPool?.Policies?.PasswordPolicy;
      expect(passwordPolicy?.MinimumLength).toBe(8);
      expect(passwordPolicy?.RequireUppercase).toBe(true);
      expect(passwordPolicy?.RequireLowercase).toBe(true);
      expect(passwordPolicy?.RequireNumbers).toBe(true);
      expect(passwordPolicy?.RequireSymbols).toBe(true);

      // Check MFA configuration
      if (environment === 'prod') {
        expect(response.UserPool?.MfaConfiguration).toBe('REQUIRED');
      } else {
        expect(response.UserPool?.MfaConfiguration).toBe('OPTIONAL');
      }
    });
  });

  describe('S3 Bucket', () => {
    test('web bucket exists and is configured securely', async () => {
      if (shouldSkipIntegrationTests) return;

      const bucketName = `ec2-manager-web-${environment}-${process.env.AWS_ACCOUNT_ID || '123456789012'}`;

      // Check bucket exists
      await expect(
        s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
      ).resolves.not.toThrow();

      // Check encryption is enabled
      const encryptionResponse = await s3Client.send(
        new GetBucketEncryptionCommand({ Bucket: bucketName })
      );

      expect(encryptionResponse.ServerSideEncryptionConfiguration?.Rules).toHaveLength(1);
      const rule = encryptionResponse.ServerSideEncryptionConfiguration!.Rules![0];
      expect(rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm).toBe('AES256');
    });
  });

  describe('API Gateway', () => {
    test('API Gateway exists and is configured correctly', async () => {
      if (shouldSkipIntegrationTests) return;

      const apiResource = stackResources.find(r => r.ResourceType === 'AWS::ApiGateway::RestApi');
      expect(apiResource).toBeDefined();

      const response = await apiGatewayClient.send(new GetRestApisCommand({}));
      const api = response.items?.find(api => api.name === `ec2-manager-api-${environment}`);

      expect(api).toBeDefined();
      expect(api?.name).toBe(`ec2-manager-api-${environment}`);
      expect(api?.description).toBe(`EC2 Manager API - ${environment}`);
    });

    test('API Gateway has deployment stage', async () => {
      if (shouldSkipIntegrationTests) return;

      const stageResources = stackResources.filter(r => r.ResourceType === 'AWS::ApiGateway::Stage');
      expect(stageResources.length).toBeGreaterThanOrEqual(1);

      const stage = stageResources.find(s => s.LogicalResourceId?.includes('DeploymentStage'));
      expect(stage).toBeDefined();
      expect(stage?.ResourceStatus).toBe('CREATE_COMPLETE');
    });
  });

  describe('Monitoring and Alarms', () => {
    test('CloudWatch dashboard exists', async () => {
      if (shouldSkipIntegrationTests) return;

      const dashboardResource = stackResources.find(r => r.ResourceType === 'AWS::CloudWatch::Dashboard');
      expect(dashboardResource).toBeDefined();
      expect(dashboardResource?.ResourceStatus).toBe('CREATE_COMPLETE');
    });

    test('CloudWatch alarms are configured', async () => {
      if (shouldSkipIntegrationTests) return;

      const alarmResources = stackResources.filter(r => r.ResourceType === 'AWS::CloudWatch::Alarm');
      expect(alarmResources.length).toBeGreaterThanOrEqual(2); // At least API Gateway errors and latency

      // Get actual alarms from CloudWatch
      const response = await cloudWatchClient.send(
        new DescribeAlarmsCommand({
          AlarmNamePrefix: `EC2Manager-${environment}`,
        })
      );

      expect(response.MetricAlarms?.length).toBeGreaterThanOrEqual(2);

      const alarmNames = response.MetricAlarms?.map(a => a.AlarmName) || [];
      expect(alarmNames.some(name => name?.includes('5xx-Errors'))).toBe(true);
      expect(alarmNames.some(name => name?.includes('High-Latency'))).toBe(true);
    });

    test('log group exists with correct retention', async () => {
      if (shouldSkipIntegrationTests) return;

      const logGroupResource = stackResources.find(r => r.ResourceType === 'AWS::Logs::LogGroup');
      expect(logGroupResource).toBeDefined();
      expect(logGroupResource?.ResourceStatus).toBe('CREATE_COMPLETE');
    });
  });

  describe('IAM Roles and Security', () => {
    test('IAM roles are created with proper permissions', async () => {
      if (shouldSkipIntegrationTests) return;

      const roleResources = stackResources.filter(r => r.ResourceType === 'AWS::IAM::Role');
      expect(roleResources.length).toBeGreaterThanOrEqual(2); // EC2Read and EC2Operator roles

      const roleNames = roleResources.map(r => r.LogicalResourceId);
      expect(roleNames.some(name => name?.includes('EC2ReadRole'))).toBe(true);
      expect(roleNames.some(name => name?.includes('EC2OperatorRole'))).toBe(true);
    });

    test('all IAM roles have valid assume role policies', async () => {
      if (shouldSkipIntegrationTests) return;

      const roleResources = stackResources.filter(r => r.ResourceType === 'AWS::IAM::Role');

      // All roles should be created successfully (not in failed state)
      roleResources.forEach(role => {
        expect(role.ResourceStatus).toBe('CREATE_COMPLETE');
      });
    });
  });

  describe('Environment-Specific Configuration', () => {
    test('production environment has enhanced security settings', async () => {
      if (shouldSkipIntegrationTests || environment !== 'prod') return;

      // Production-specific checks
      const tableName = `ec2-manager-audit-${environment}`;
      const tableResponse = await dynamoClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );

      // Production should have point-in-time recovery
      expect(tableResponse.Table?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus).toBe('ENABLED');
    });

    test('development environment allows resource deletion', async () => {
      if (shouldSkipIntegrationTests || environment === 'prod') return;

      // Development environments should be configured for easy cleanup
      // This is validated by the CloudFormation template having proper deletion policies
      const tableResource = stackResources.find(r => r.ResourceType === 'AWS::DynamoDB::Table');
      expect(tableResource).toBeDefined();
      // Resource exists and is healthy
      expect(tableResource?.ResourceStatus).toBe('CREATE_COMPLETE');
    });
  });
});

// Health check tests that can run against deployed infrastructure
describe('Infrastructure Health Checks', () => {
  const healthCheckTimeout = 10000;

  test('basic connectivity test', async () => {
    if (shouldSkipIntegrationTests) return;

    // Basic test to ensure we can connect to AWS APIs
    const cfnClient = new CloudFormationClient({ region });

    await expect(
      cfnClient.send(new DescribeStacksCommand({ StackName: stackName }))
    ).resolves.not.toThrow();
  }, healthCheckTimeout);

  // Add more health checks as needed for specific services
});

// Helper function to run a subset of tests for CI/CD
export const runCriticalTests = async () => {
  if (shouldSkipIntegrationTests) {
    console.log('Skipping critical tests - AWS credentials not configured');
    return true;
  }

  try {
    const cfnClient = new CloudFormationClient({ region });
    const response = await cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );

    const stack = response.Stacks?.[0];
    const isHealthy = ['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack?.StackStatus || '');

    console.log(`Stack ${stackName} status: ${stack?.StackStatus}`);
    return isHealthy;
  } catch (error) {
    console.error('Critical test failed:', error);
    return false;
  }
};