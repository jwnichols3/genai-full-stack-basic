import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

interface MonitoringStackProps extends StackProps {
  environment: string;
  api: apigateway.RestApi;
  auditTable: dynamodb.Table;
  alertEmail?: string;
}

export class MonitoringStack extends Stack {
  public readonly alertTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, api, auditTable, alertEmail } = props;

    // SNS Topic for Alerts
    this.alertTopic = this.createAlertTopic(environment, alertEmail);

    // Enhanced CloudWatch Dashboard
    this.dashboard = this.createEnhancedDashboard(environment, api, auditTable);

    // Application-Level Alarms
    this.createApplicationAlarms(environment, api, auditTable);

    // AWS CloudTrail for Audit Logging
    this.createCloudTrail(environment);

    // Custom Metrics Lambda
    this.createCustomMetricsCollector(environment, auditTable);
  }

  private createAlertTopic(env: string, alertEmail?: string): sns.Topic {
    const topic = new sns.Topic(this, `AlertTopic-${env}`, {
      topicName: `ec2-manager-alerts-${env}`,
      displayName: `EC2 Manager Alerts - ${env}`,
    });

    if (alertEmail) {
      topic.addSubscription(new snsSubscriptions.EmailSubscription(alertEmail));
    }

    return topic;
  }

  private createEnhancedDashboard(
    env: string,
    api: apigateway.RestApi,
    auditTable: dynamodb.Table
  ): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, `EnhancedDashboard-${env}`, {
      dashboardName: `EC2Manager-Enhanced-${env}`,
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // API Gateway Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Performance Overview',
        width: 12,
        height: 6,
        left: [
          api.metricCount({ period: Duration.minutes(5), statistic: 'Sum' }),
          api.metricLatency({ period: Duration.minutes(5), statistic: 'Average' }),
        ],
        leftYAxis: { label: 'Requests', showUnits: false },
        right: [
          api.metricIntegrationLatency({ period: Duration.minutes(5), statistic: 'Average' }),
        ],
        rightYAxis: { label: 'Latency (ms)', showUnits: false },
      }),

      new cloudwatch.GraphWidget({
        title: 'API Error Analysis',
        width: 12,
        height: 6,
        left: [
          api.metricClientError({ period: Duration.minutes(5), statistic: 'Sum' }),
          api.metricServerError({ period: Duration.minutes(5), statistic: 'Sum' }),
        ],
        leftAnnotations: [
          { value: 10, label: 'Error Threshold', color: cloudwatch.Color.RED },
        ],
      })
    );

    // DynamoDB Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Performance',
        width: 8,
        height: 6,
        left: [
          auditTable.metricConsumedReadCapacityUnits(),
          auditTable.metricConsumedWriteCapacityUnits(),
        ],
        right: [
          auditTable.metricSuccessfulRequestLatency({ operation: 'PutItem' }),
          auditTable.metricSuccessfulRequestLatency({ operation: 'Query' }),
        ],
      }),

      new cloudwatch.GraphWidget({
        title: 'DynamoDB Throttling & Errors',
        width: 8,
        height: 6,
        left: [
          auditTable.metricThrottledRequests({ operation: 'PutItem' }),
          auditTable.metricThrottledRequests({ operation: 'Query' }),
        ],
        right: [
          auditTable.metricUserErrors(),
          auditTable.metricSystemErrors(),
        ],
      }),

      new cloudwatch.SingleValueWidget({
        title: 'DynamoDB Item Count',
        width: 8,
        height: 6,
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ItemCount',
            dimensionsMap: {
              TableName: auditTable.tableName,
            },
            statistic: 'Average',
          }),
        ],
      })
    );

    // Custom Business Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'EC2 Management Operations',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Operations',
            metricName: 'InstanceStart',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Operations',
            metricName: 'InstanceStop',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Operations',
            metricName: 'InstanceReboot',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
      }),

      new cloudwatch.GraphWidget({
        title: 'User Activity',
        width: 6,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Users',
            metricName: 'ActiveUsers',
            statistic: 'Sum',
            period: Duration.hours(1),
          }),
        ],
      }),

      new cloudwatch.GraphWidget({
        title: 'Security Events',
        width: 6,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Security',
            metricName: 'AuthenticationFailures',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Security',
            metricName: 'UnauthorizedAccess',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        leftAnnotations: [
          { value: 5, label: 'Security Alert Threshold', color: cloudwatch.Color.RED },
        ],
      })
    );

    // System Health Summary
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'System Health Score',
        width: 4,
        height: 3,
        metrics: [
          new cloudwatch.MathExpression({
            expression: '(100 - (m1/m2)*100)',
            usingMetrics: {
              m1: api.metricServerError({ statistic: 'Sum' }),
              m2: api.metricCount({ statistic: 'Sum' }),
            },
            label: 'Health %',
          }),
        ],
        sparkline: true,
      }),

      new cloudwatch.SingleValueWidget({
        title: 'Avg Response Time',
        width: 4,
        height: 3,
        metrics: [api.metricLatency({ statistic: 'Average' })],
        sparkline: true,
      }),

      new cloudwatch.SingleValueWidget({
        title: 'Daily Operations',
        width: 4,
        height: 3,
        metrics: [
          new cloudwatch.Metric({
            namespace: 'EC2Manager/Operations',
            metricName: 'TotalOperations',
            statistic: 'Sum',
            period: Duration.days(1),
          }),
        ],
      })
    );

    return dashboard;
  }

  private createApplicationAlarms(
    env: string,
    api: apigateway.RestApi,
    auditTable: dynamodb.Table
  ): void {
    // Critical API Errors
    new cloudwatch.Alarm(this, `CriticalApiErrors-${env}`, {
      alarmName: `EC2Manager-${env}-Critical-API-Errors`,
      metric: api.metricServerError({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 3,
      evaluationPeriods: 2,
      alarmDescription: 'Critical API errors detected',
      actionsEnabled: true,
    }).addAlarmAction(new cloudwatch.actions.SnsAction(this.alertTopic));

    // High Latency
    new cloudwatch.Alarm(this, `HighLatency-${env}`, {
      alarmName: `EC2Manager-${env}-High-Latency`,
      metric: api.metricLatency({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 2000, // 2 seconds
      evaluationPeriods: 3,
      alarmDescription: 'High API latency detected',
    }).addAlarmAction(new cloudwatch.actions.SnsAction(this.alertTopic));

    // DynamoDB Throttling
    new cloudwatch.Alarm(this, `DynamoDBThrottling-${env}`, {
      alarmName: `EC2Manager-${env}-DDB-Throttling`,
      metric: auditTable.metricThrottledRequests(),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'DynamoDB throttling detected',
    }).addAlarmAction(new cloudwatch.actions.SnsAction(this.alertTopic));

    // Security Alert - Authentication Failures
    new cloudwatch.Alarm(this, `SecurityAlert-${env}`, {
      alarmName: `EC2Manager-${env}-Security-Alert`,
      metric: new cloudwatch.Metric({
        namespace: 'EC2Manager/Security',
        metricName: 'AuthenticationFailures',
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'High number of authentication failures',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.actions.SnsAction(this.alertTopic));

    // Low Activity Alert (might indicate system issues)
    new cloudwatch.Alarm(this, `LowActivityAlert-${env}`, {
      alarmName: `EC2Manager-${env}-Low-Activity`,
      metric: api.metricCount({
        period: Duration.hours(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Unusually low API activity',
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    }).addAlarmAction(new cloudwatch.actions.SnsAction(this.alertTopic));
  }

  private createCloudTrail(env: string): void {
    // S3 bucket for CloudTrail logs
    const trailBucket = new s3.Bucket(this, `CloudTrailBucket-${env}`, {
      bucketName: `ec2-manager-cloudtrail-${env}-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudTrail for API calls and security auditing
    new cloudtrail.Trail(this, `CloudTrail-${env}`, {
      trailName: `ec2-manager-trail-${env}`,
      bucket: trailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      eventSelectors: [
        {
          readWriteType: cloudtrail.ReadWriteType.ALL,
          includeManagementEvents: true,
          dataResources: [
            {
              type: 'AWS::S3::Object',
              values: [`${trailBucket.bucketArn}/*`],
            },
            {
              type: 'AWS::DynamoDB::Table',
              values: ['*'],
            },
          ],
        },
      ],
    });
  }

  private createCustomMetricsCollector(env: string, auditTable: dynamodb.Table): void {
    // Lambda function to collect and publish custom metrics
    const metricsCollector = new lambda.Function(this, `MetricsCollector-${env}`, {
      functionName: `ec2-manager-metrics-${env}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
        const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

        const cloudwatch = new CloudWatchClient();
        const dynamodb = new DynamoDBClient();

        exports.handler = async (event) => {
          try {
            // Collect metrics from DynamoDB audit table
            const scanCommand = new ScanCommand({
              TableName: process.env.AUDIT_TABLE_NAME,
              FilterExpression: '#timestamp > :since',
              ExpressionAttributeNames: { '#timestamp': 'timestamp' },
              ExpressionAttributeValues: {
                ':since': { S: new Date(Date.now() - 3600000).toISOString() } // Last hour
              },
              ProjectionExpression: 'operation_type, user_id'
            });

            const result = await dynamodb.send(scanCommand);
            const operations = {};
            const users = new Set();

            result.Items?.forEach(item => {
              const opType = item.operation_type?.S;
              if (opType) {
                operations[opType] = (operations[opType] || 0) + 1;
              }
              if (item.user_id?.S) {
                users.add(item.user_id.S);
              }
            });

            // Publish custom metrics
            const metrics = [];

            // Operation metrics
            Object.entries(operations).forEach(([op, count]) => {
              metrics.push({
                MetricName: op,
                Value: count,
                Unit: 'Count',
                Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }]
              });
            });

            // Active users
            metrics.push({
              MetricName: 'ActiveUsers',
              Value: users.size,
              Unit: 'Count',
              Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }]
            });

            if (metrics.length > 0) {
              await cloudwatch.send(new PutMetricDataCommand({
                Namespace: 'EC2Manager/Operations',
                MetricData: metrics
              }));
            }

            return { statusCode: 200, body: JSON.stringify({ metricsPublished: metrics.length }) };
          } catch (error) {
            console.error('Error collecting metrics:', error);
            throw error;
          }
        };
      `),
      environment: {
        AUDIT_TABLE_NAME: auditTable.tableName,
        ENVIRONMENT: env,
      },
      timeout: Duration.minutes(5),
    });

    // Grant permissions
    auditTable.grantReadData(metricsCollector);
    metricsCollector.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Schedule to run every 15 minutes
    new events.Rule(this, `MetricsSchedule-${env}`, {
      schedule: events.Schedule.rate(Duration.minutes(15)),
      targets: [new eventsTargets.LambdaFunction(metricsCollector)],
    });
  }
}