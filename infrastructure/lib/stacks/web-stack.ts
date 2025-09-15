import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface WebStackProps extends cdk.StackProps {
  environment: string;
}

export class WebStack extends cdk.Stack {
  public readonly distributionUrl: string;
  public readonly s3BucketName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `ec2-manager-web-${environment}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environment
      autoDeleteObjects: true, // For dev environment
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for EC2Manager Web ${environment}`,
    });

    // Grant CloudFront access to S3 bucket
    websiteBucket.grantRead(originAccessIdentity);

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        // No cache for index.html to ensure fresh app updates
        '/index.html': {
          origin: new origins.S3Origin(websiteBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // Store values for outputs
    this.distributionUrl = `https://${distribution.distributionDomainName}`;
    this.s3BucketName = websiteBucket.bucketName;
    this.distributionId = distribution.distributionId;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: this.distributionUrl,
      description: 'CloudFront distribution URL',
      exportName: `${id}-CloudFrontURL`,
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.s3BucketName,
      description: 'S3 bucket name for deployment',
      exportName: `${id}-S3BucketName`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distributionId,
      description: 'CloudFront distribution ID for invalidation',
      exportName: `${id}-DistributionId`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'EC2Manager');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'Frontend');
  }
}
