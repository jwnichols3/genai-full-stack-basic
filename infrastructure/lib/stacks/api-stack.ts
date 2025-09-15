import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  cloudfrontDistributionUrl: string;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly apiGateway: apigateway.RestApi;
  public readonly lambdaExecutionRole: iam.Role;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { environment, cloudfrontDistributionUrl } = props;

    // Create CloudWatch log group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/ec2-manager-api-${environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda execution role with proper permissions
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `ec2-manager-lambda-role-${environment}`,
      description: 'Execution role for EC2Manager Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        EC2AccessPolicy: new iam.PolicyDocument({
          statements: [
            // CloudWatch Logs permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
            }),
            // EC2 permissions for instance management
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:DescribeInstanceStatus',
                'ec2:RebootInstances',
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': this.region,
                },
              },
            }),
          ],
        }),
      },
    });

    // Create REST API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'EC2ManagerApi', {
      restApiName: `ec2-manager-api-${environment}`,
      description: `EC2 Manager REST API for ${environment} environment`,
      deployOptions: {
        stageName: environment,
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.custom(
          [
            'requestId: $context.requestId',
            'ip: $context.identity.sourceIp',
            'user: $context.identity.user',
            'requestTime: $context.requestTime',
            'httpMethod: $context.httpMethod',
            'resourcePath: $context.resourcePath',
            'status: $context.status',
            'protocol: $context.protocol',
            'responseLength: $context.responseLength',
            'responseTime: $context.responseTime',
            'userAgent: $context.identity.userAgent',
          ].join(', ')
        ),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [cloudfrontDistributionUrl],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Authorization',
          'Content-Type',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        exposeHeaders: ['X-Request-Id'],
        maxAge: cdk.Duration.hours(24),
      },
    });

    // Create API resource structure: /api/v1
    const apiResource = this.apiGateway.root.addResource('api');
    const v1Resource = apiResource.addResource('v1');

    // Note: Instance resources will be added in subsequent stories
    // const instancesResource = v1Resource.addResource('instances');

    // Create health check Lambda function
    const healthCheckFunction = new nodejs.NodejsFunction(this, 'HealthCheckFunction', {
      functionName: `ec2-manager-health-check-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../../apps/api/src/functions/health/check.ts'),
      role: this.lambdaExecutionRole,
      environment: {
        NODE_ENV: environment,
        REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      description: 'Health check endpoint for EC2Manager API',
    });

    // Add a health endpoint for testing API Gateway-Lambda integration
    const healthResource = v1Resource.addResource('health');
    const healthIntegration = new apigateway.LambdaIntegration(healthCheckFunction, {
      requestTemplates: {
        'application/json': '{"statusCode": "200"}',
      },
      proxy: true,
    });

    healthResource.addMethod('GET', healthIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.X-Request-Id': true,
          },
        },
      ],
    });

    // Store API URL for outputs
    this.apiUrl = this.apiGateway.url;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.apiUrl,
      description: 'API Gateway REST API URL',
      exportName: `${id}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.apiGateway.restApiId,
      description: 'API Gateway REST API ID',
      exportName: `${id}-ApiId`,
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: `${id}-LambdaRoleArn`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'EC2Manager');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'API');
  }
}
