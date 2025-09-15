#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';
import { WebStack } from '../lib/stacks/web-stack';
import { ApiStack } from '../lib/stacks/api-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

new AppStack(app, `EC2Manager-${environment}`, {
  environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
  description: `EC2 Instance Manager - ${environment} environment`,
  tags: {
    Project: 'EC2Manager',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

const webStack = new WebStack(app, `EC2Manager-Web-${environment}`, {
  environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
  description: `EC2 Instance Manager Web Stack - ${environment} environment`,
  tags: {
    Project: 'EC2Manager',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

new ApiStack(app, `EC2Manager-Api-${environment}`, {
  environment,
  cloudfrontDistributionUrl: webStack.distributionUrl,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
  description: `EC2 Instance Manager API Stack - ${environment} environment`,
  tags: {
    Project: 'EC2Manager',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});
