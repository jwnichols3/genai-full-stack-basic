import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AppStack } from '../../lib/app-stack';

describe('AppStack', () => {
  let app: App;
  let stack: AppStack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    stack = new AppStack(app, 'TestStack', {
      environment: 'test',
      env: { account: '123456789012', region: 'us-west-2' },
    });
    template = Template.fromStack(stack);
  });

  describe('VPC Configuration', () => {
    test('creates VPC with correct CIDR', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('creates public and private subnets', () => {
      // Should have 2 public subnets
      template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private

      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true, // Public subnet
      });

      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false, // Private subnet
      });
    });

    test('creates NAT gateways for private subnets', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
      template.resourceCountIs('AWS::EC2::EIP', 2);
    });

    test('creates internet gateway', () => {
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
      template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
    });

    test('restricts default security group', () => {
      template.hasResourceProperties('Custom::VpcRestrictDefaultSG', {
        Account: '123456789012',
      });
    });
  });

  describe('Authentication - Cognito', () => {
    test('creates user pool with correct configuration', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'ec2-manager-test',
        AutoVerifiedAttributes: ['email'],
        MfaConfiguration: 'OPTIONAL',
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            RequireUppercase: true,
          },
        },
        UsernameAttributes: ['email'],
      });
    });

    test('creates user pool client', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'ec2-manager-client-test',
        ExplicitAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
        GenerateSecret: false,
      });
    });

    test('enables MFA for production environment', () => {
      const prodStack = new AppStack(app, 'ProdStack', {
        environment: 'prod',
        env: { account: '123456789012', region: 'us-west-2' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        MfaConfiguration: 'REQUIRED',
      });
    });
  });

  describe('Data Layer - DynamoDB', () => {
    test('creates audit table with correct configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ec2-manager-audit-test',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'timestamp', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        SSESpecification: { SSEEnabled: true },
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });

    test('enables point-in-time recovery for production', () => {
      const prodStack = new AppStack(app, 'ProdStack', {
        environment: 'prod',
        env: { account: '123456789012', region: 'us-west-2' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });
  });

  describe('Web Hosting - S3 and CloudFront', () => {
    test('creates S3 bucket with correct configuration', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'ec2-manager-web-test-123456789012',
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        WebsiteConfiguration: {
          ErrorDocument: 'error.html',
          IndexDocument: 'index.html',
        },
      });
    });

    test('creates CloudFront distribution', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
          Enabled: true,
          HttpVersion: 'http2',
          IPV6Enabled: true,
          CustomErrorResponses: [
            {
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            },
          ],
        },
      });
    });

    test('creates origin access identity', () => {
      template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    });
  });

  describe('API Layer', () => {
    test('creates API Gateway with correct configuration', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'ec2-manager-api-test',
        Description: 'EC2 Manager API - test',
      });
    });

    test('configures CORS for API Gateway', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
        AuthorizationType: 'NONE',
        Integration: {
          Type: 'MOCK',
          IntegrationResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
              },
            },
          ],
        },
      });
    });

    test('enables logging and metrics', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'test',
        MethodSettings: [
          {
            DataTraceEnabled: true,
            HttpMethod: '*',
            LoggingLevel: 'INFO',
            MetricsEnabled: true,
            ResourcePath: '/*',
          },
        ],
      });
    });
  });

  describe('IAM Roles and Permissions', () => {
    test('creates EC2 read role with minimal permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'ec2-manager-read-test',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
            },
          ],
        },
      });

      // Check inline policy for EC2 read permissions
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: [
          {
            PolicyName: 'EC2ReadOnly',
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'ec2:DescribeImages',
                    'ec2:DescribeInstanceStatus',
                    'ec2:DescribeInstances',
                    'ec2:DescribeKeyPairs',
                    'ec2:DescribeSecurityGroups',
                    'ec2:DescribeSubnets',
                    'ec2:DescribeVpcs',
                  ],
                  Resource: '*',
                },
              ],
            },
          },
        ],
      });
    });

    test('creates EC2 operator role with start/stop permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'ec2-manager-operator-test',
      });

      // Check for EC2 operation permissions
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: [
          {
            PolicyName: 'EC2Operations',
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'ec2:DescribeInstanceStatus',
                    'ec2:DescribeInstances',
                    'ec2:RebootInstances',
                    'ec2:StartInstances',
                    'ec2:StopInstances',
                  ],
                  Resource: '*',
                },
              ],
            },
          },
        ],
      });
    });

    test('grants DynamoDB access to IAM roles', () => {
      // Both roles should have DynamoDB write permissions
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          Policies: [
            {
              PolicyName: 'DynamoDBWrite',
              PolicyDocument: {
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
                  },
                ],
              },
            },
          ],
        },
      });

      expect(Object.keys(roles).length).toBe(2); // EC2ReadRole and EC2OperatorRole
    });
  });

  describe('Monitoring and Logging', () => {
    test('creates CloudWatch log group', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/ec2-manager/test',
        RetentionInDays: 7, // Test environment
      });
    });

    test('creates CloudWatch dashboard', () => {
      template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'EC2Manager-test',
      });
    });

    test('creates CloudWatch alarms', () => {
      template.resourceCountIs('AWS::CloudWatch::Alarm', 3); // API Gateway errors, latency, and test bucket

      // API Gateway 5xx errors alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'EC2Manager-test-API-5xx-Errors',
        MetricName: '5XXError',
        Namespace: 'AWS/ApiGateway',
        Threshold: 5,
      });

      // API Gateway latency alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'EC2Manager-test-API-High-Latency',
        MetricName: 'Latency',
        Namespace: 'AWS/ApiGateway',
        Threshold: 1000,
      });
    });

    test('uses shorter retention for non-production environments', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7,
      });

      // Test production has longer retention
      const prodStack = new AppStack(app, 'ProdStack', {
        environment: 'prod',
        env: { account: '123456789012', region: 'us-west-2' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30,
      });
    });
  });

  describe('Security Compliance', () => {
    test('enables encryption for all data stores', () => {
      // DynamoDB encryption
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: { SSEEnabled: true },
      });

      // S3 bucket encryption
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    test('blocks public access on S3 bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('applies retention policies correctly', () => {
      // Test environment should allow deletion
      template.hasResource('AWS::DynamoDB::Table', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
      });

      // Production should retain resources
      const prodStack = new AppStack(app, 'ProdStack', {
        environment: 'prod',
        env: { account: '123456789012', region: 'us-west-2' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResource('AWS::DynamoDB::Table', {
        UpdateReplacePolicy: 'Retain',
        DeletionPolicy: 'Retain',
      });
    });
  });

  describe('CI/CD Test Resources', () => {
    test('creates test bucket for CI/CD validation', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'ec2-manager-cicd-test-test-123456789012',
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DeleteAfter30Days',
              Status: 'Enabled',
              ExpirationInDays: 30,
            },
          ],
        },
      });
    });

    test('creates test bucket alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'EC2Manager-test-Test-Bucket-Objects',
        AlarmDescription: 'CI/CD Test - Monitor test bucket size in test',
        MetricName: 'BucketSizeBytes',
        Namespace: 'AWS/S3',
        Threshold: 104857600, // 100 MB in bytes
      });
    });

    test('test resources use proper removal policies', () => {
      // Test environment should allow deletion
      template.hasResource('AWS::S3::Bucket', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
        Properties: {
          BucketName: 'ec2-manager-cicd-test-test-123456789012',
        },
      });
    });
  });

  describe('Resource Tagging', () => {
    test('applies consistent tagging strategy', () => {
      // All major resources should be tagged
      template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: [{ Key: 'Name', Value: 'TestStack/Vpc-test' }],
      });
    });
  });
});

// Integration test helpers
describe('Stack Integration', () => {
  test('stack synthesizes without errors', () => {
    const app = new App();

    // Test all environments
    const environments = ['dev', 'staging', 'prod'];

    environments.forEach(env => {
      expect(() => {
        new AppStack(app, `TestStack-${env}`, {
          environment: env,
          env: { account: '123456789012', region: 'us-west-2' },
        });
      }).not.toThrow();
    });
  });

  test('outputs are correctly defined', () => {
    const app = new App();
    const stack = new AppStack(app, 'OutputTestStack', {
      environment: 'test',
      env: { account: '123456789012', region: 'us-west-2' },
    });

    // Verify stack has expected public properties
    expect(stack.vpc).toBeDefined();
    expect(stack.userPool).toBeDefined();
    expect(stack.auditTable).toBeDefined();
    expect(stack.webBucket).toBeDefined();
    expect(stack.distribution).toBeDefined();
    expect(stack.api).toBeDefined();
  });
});