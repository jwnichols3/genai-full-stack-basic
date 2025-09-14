import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';

interface AppStackProps extends StackProps {
  environment?: string;
}

export class AppStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly userPool: cognito.UserPool;
  public readonly auditTable: dynamodb.Table;
  public readonly webBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly logGroup: logs.LogGroup;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly auditTrail: cloudtrail.Trail;

  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props);

    const env = props?.environment || 'dev';

    // 1. VPC - Foundation Network
    this.vpc = this.createVpc(env);

    // 1.5. Security Groups - Network Protection
    const securityGroups = this.createSecurityGroups(env);
    this.lambdaSecurityGroup = securityGroups.lambdaSecurityGroup;
    this.dbSecurityGroup = securityGroups.dbSecurityGroup;

    // 2. Authentication - Cognito User Pool
    this.userPool = this.createUserPool(env);

    // 3. Data Layer - DynamoDB Tables
    this.auditTable = this.createAuditTable(env);

    // 4. Web Hosting - S3 + CloudFront
    this.webBucket = this.createWebBucket(env);
    this.distribution = this.createCloudFrontDistribution();

    // 5. API Layer - API Gateway + Lambda
    this.api = this.createApiGateway(env);

    // 6. IAM Roles for EC2 Management
    this.createIamRoles(env);

    // 7. Monitoring and Logging
    this.logGroup = this.createMonitoring(env);

    // 7.5. Security Audit Logging - CloudTrail
    this.auditTrail = this.createAuditLogging(env);

    // 8. CI/CD Pipeline Test - Simple S3 Bucket for testing
    this.createTestBucket(env);
  }

  private createVpc(env: string): ec2.Vpc {
    return new ec2.Vpc(this, `Vpc-${env}`, {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
  }

  private createSecurityGroups(env: string): {
    lambdaSecurityGroup: ec2.SecurityGroup;
    dbSecurityGroup: ec2.SecurityGroup;
  } {
    // Lambda Security Group - Restrictive by default
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, `LambdaSecurityGroup-${env}`, {
      vpc: this.vpc,
      description: `Security group for Lambda functions - ${env}`,
      allowAllOutbound: false, // Explicit control over egress
    });

    // Allow Lambda to reach AWS services over HTTPS
    lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS for AWS API calls (DynamoDB, Cognito, etc.)'
    );

    // Allow Lambda to reach AWS services over HTTP (for some AWS endpoints)
    lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP for AWS service endpoints'
    );

    // Database/Internal Services Security Group
    const dbSecurityGroup = new ec2.SecurityGroup(this, `DatabaseSecurityGroup-${env}`, {
      vpc: this.vpc,
      description: `Security group for database and internal services - ${env}`,
      allowAllOutbound: false,
    });

    // Allow Lambda to access database services
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Lambda access to internal services'
    );

    // VPC Flow Logs Security Group (for monitoring)
    const vpcFlowLogsSecurityGroup = new ec2.SecurityGroup(this, `VpcFlowLogsSecurityGroup-${env}`, {
      vpc: this.vpc,
      description: `Security group for VPC Flow Logs - ${env}`,
      allowAllOutbound: false,
    });

    // Allow VPC Flow Logs to send to CloudWatch
    vpcFlowLogsSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'CloudWatch Logs delivery'
    );

    // Enable VPC Flow Logs for security monitoring
    new ec2.FlowLog(this, `VpcFlowLog-${env}`, {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(this.logGroup),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    return { lambdaSecurityGroup, dbSecurityGroup };
  }

  private createUserPool(env: string): cognito.UserPool {
    const userPool = new cognito.UserPool(this, `UserPool-${env}`, {
      userPoolName: `ec2-manager-${env}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: env === 'prod' ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // User Pool Client
    new cognito.UserPoolClient(this, `UserPoolClient-${env}`, {
      userPool,
      userPoolClientName: `ec2-manager-client-${env}`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    return userPool;
  }

  private createAuditTable(env: string): dynamodb.Table {
    return new dynamodb.Table(this, `AuditTable-${env}`, {
      tableName: `ec2-manager-audit-${env}`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: env === 'prod',
      },
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });
  }

  private createWebBucket(env: string): s3.Bucket {
    return new s3.Bucket(this, `WebBucket-${env}`, {
      bucketName: `ec2-manager-web-${env}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: env === 'prod',
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
    });
  }

  private createCloudFrontDistribution(): cloudfront.Distribution {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');
    this.webBucket.grantRead(originAccessIdentity);

    return new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.webBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
  }

  private createApiGateway(env: string): apigateway.RestApi {
    return new apigateway.RestApi(this, `Api-${env}`, {
      restApiName: `ec2-manager-api-${env}`,
      description: `EC2 Manager API - ${env}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: env,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });
  }

  private createIamRoles(env: string): void {
    // EC2 Read Role
    new iam.Role(this, `EC2ReadRole-${env}`, {
      roleName: `ec2-manager-read-${env}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        EC2ReadOnly: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:DescribeInstanceStatus',
                'ec2:DescribeImages',
                'ec2:DescribeKeyPairs',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeSubnets',
                'ec2:DescribeVpcs',
              ],
              resources: ['*'],
            }),
          ],
        }),
        DynamoDBWrite: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:PutItem',
                'dynamodb:Query',
                'dynamodb:GetItem',
              ],
              resources: [this.auditTable.tableArn],
            }),
          ],
        }),
      },
    });

    // EC2 Operator Role
    new iam.Role(this, `EC2OperatorRole-${env}`, {
      roleName: `ec2-manager-operator-${env}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        EC2Operations: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:DescribeInstanceStatus',
                'ec2:StartInstances',
                'ec2:StopInstances',
                'ec2:RebootInstances',
              ],
              resources: ['*'],
            }),
          ],
        }),
        DynamoDBWrite: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:PutItem',
                'dynamodb:Query',
                'dynamodb:GetItem',
              ],
              resources: [this.auditTable.tableArn],
            }),
          ],
        }),
      },
    });
  }

  private createMonitoring(env: string): logs.LogGroup {
    // Central Log Group for API Gateway and Lambda
    const logGroup = new logs.LogGroup(this, `LogGroup-${env}`, {
      logGroupName: `/aws/ec2-manager/${env}`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, `Dashboard-${env}`, {
      dashboardName: `EC2Manager-${env}`,
    });

    // API Gateway Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [this.api.metricCount()],
        right: [this.api.metricLatency()],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [this.api.metricClientError(), this.api.metricServerError()],
      })
    );

    // DynamoDB Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Operations',
        left: [
          this.auditTable.metricConsumedReadCapacityUnits(),
          this.auditTable.metricConsumedWriteCapacityUnits(),
        ],
      })
    );

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, `ApiGateway5xxAlarm-${env}`, {
      alarmName: `EC2Manager-${env}-API-5xx-Errors`,
      metric: this.api.metricServerError({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'High number of 5xx errors in API Gateway',
    });

    new cloudwatch.Alarm(this, `ApiGatewayLatencyAlarm-${env}`, {
      alarmName: `EC2Manager-${env}-API-High-Latency`,
      metric: this.api.metricLatency({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 1000, // 1 second
      evaluationPeriods: 3,
      alarmDescription: 'High latency in API Gateway',
    });

    return logGroup;
  }

  private createAuditLogging(env: string): cloudtrail.Trail {
    // CloudTrail S3 Bucket for audit log storage
    const auditLogsBucket = new s3.Bucket(this, `AuditLogsBucket-${env}`, {
      bucketName: `ec2-manager-audit-logs-${env}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
      lifecycleRules: [
        {
          id: 'AuditLogRetention',
          enabled: true,
          // Keep audit logs for compliance
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
          expiration: env === 'prod' ? Duration.days(2555) : Duration.days(90), // 7 years for prod
        },
      ],
    });

    // CloudWatch Log Group for CloudTrail
    const cloudTrailLogGroup = new logs.LogGroup(this, `CloudTrailLogs-${env}`, {
      logGroupName: `/aws/cloudtrail/ec2-manager-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.RETAIN, // Always retain audit logs
    });

    // CloudTrail will use the default service role for CloudWatch Logs

    // CloudTrail for comprehensive audit logging
    const trail = new cloudtrail.Trail(this, `AuditTrail-${env}`, {
      bucket: auditLogsBucket,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: cloudTrailLogGroup,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
    });

    // CloudWatch Alarm for CloudTrail failures
    new cloudwatch.Alarm(this, `CloudTrailErrorAlarm-${env}`, {
      alarmName: `EC2Manager-${env}-CloudTrail-Errors`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudTrailMetrics',
        metricName: 'ErrorCount',
        dimensionsMap: {
          TrailName: `ec2-manager-audit-${env}`,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'CloudTrail logging errors detected',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // CloudWatch Alarm for unusual API activity
    new cloudwatch.Alarm(this, `UnusualApiActivityAlarm-${env}`, {
      alarmName: `EC2Manager-${env}-Unusual-API-Activity`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudTrailMetrics',
        metricName: 'Count',
        dimensionsMap: {
          TrailName: `ec2-manager-audit-${env}`,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: env === 'prod' ? 1000 : 100, // Adjust based on expected usage
      evaluationPeriods: 2,
      alarmDescription: 'Unusual API activity detected - possible security incident',
    });

    return trail;
  }

  private createTestBucket(env: string): void {
    // Simple test bucket to validate CI/CD pipeline
    // This demonstrates infrastructure changes flowing through our DevOps process
    // Now configured with real AWS credentials for deployment testing
    new s3.Bucket(this, `TestBucket-${env}`, {
      bucketName: `ec2-manager-cicd-test-${env}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: env === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
      lifecycleRules: [
        {
          id: 'DeleteAfter30Days',
          enabled: true,
          expiration: Duration.days(30),
        },
      ],
    });

    // Add a simple CloudWatch metric for the test bucket
    new cloudwatch.Alarm(this, `TestBucketAlarm-${env}`, {
      alarmName: `EC2Manager-${env}-Test-Bucket-Objects`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'BucketSizeBytes',
        dimensionsMap: {
          BucketName: `ec2-manager-cicd-test-${env}-${this.account}`,
          StorageType: 'StandardStorage',
        },
        statistic: 'Average',
        period: Duration.hours(24),
      }),
      threshold: 1024 * 1024 * 100, // 100 MB
      evaluationPeriods: 1,
      alarmDescription: `CI/CD Test - Monitor test bucket size in ${env}`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}