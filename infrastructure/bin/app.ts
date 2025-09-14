#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';

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
