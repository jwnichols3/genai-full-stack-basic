# CDK Deployment Troubleshooting Guide

## Common Issues and Solutions

### S3 Lifecycle Configuration Errors

**Error:** `'Days' in the Expiration action for filter '(prefix=)' must be greater than 'Days' in the Transition action`

**Root Cause:** AWS S3 requires expiration periods to be greater than all transition periods in lifecycle rules.

**Solution:**

1. Locate the problematic S3 bucket configuration in your CDK stack
2. Ensure expiration days > transition days for all storage classes
3. Example fix: Change expiration from 90 days to 365 days when Glacier transition is at 90 days

**Code Location:** `infrastructure/lib/app-stack.ts:436`

```typescript
// Before (BROKEN)
expiration: env === 'prod' ? Duration.days(2555) : Duration.days(90), // Same as Glacier transition!

// After (FIXED)
expiration: env === 'prod' ? Duration.days(2555) : Duration.days(365), // Greater than transition
```

### Build Process Issues

**Error:** CDK reports "no changes" but CloudFormation shows `UPDATE_ROLLBACK_COMPLETE`

**Root Cause:** TypeScript code wasn't compiled before deployment, causing CDK to use stale JavaScript files.

**Solution:**

1. Always run build before deployment: `npm run build`
2. Use the proper deployment command: `npm run deploy:dev` (includes profile)
3. Verify CloudFormation stack status matches CDK expectations

**Required Commands:**

```bash
# Correct deployment process
npm run build                    # Compile TypeScript
npm run deploy:dev              # Deploy with correct profile
# OR
cdk deploy --profile jnicamzn-sso-ec2 --require-approval never
```

### AWS Profile Configuration Issues

**Error:** Commands using wrong AWS account or failing with credential issues

**Root Cause:** AWS_PROFILE environment variable not persisting or CDK not using correct profile.

**Solution:**

1. Always use explicit `--profile` flag: `--profile jnicamzn-sso-ec2`
2. Verify account with: `aws sts get-caller-identity --profile jnicamzn-sso-ec2`
3. Use npm scripts that include the profile: `npm run deploy:dev`

### Orphaned Resource Conflicts

**Error:** `Resource of type 'AWS::Logs::LogGroup' with identifier '/aws/cloudtrail/ec2-manager-dev' already exists`

**Root Cause:** Failed deployments can leave orphaned resources that prevent new deployments.

**Solution:**

1. Identify conflicting resources from error message
2. Clean up orphaned resources manually:

```bash
aws logs delete-log-group --log-group-name "/aws/cloudtrail/ec2-manager-dev" --profile jnicamzn-sso-ec2
```

3. Retry deployment after cleanup

### CloudFormation Stack State Discrepancies

**Issue:** CDK shows different state than actual CloudFormation stack

**Debugging Steps:**

1. Check actual CloudFormation stack status:

```bash
aws cloudformation describe-stacks --stack-name EC2Manager-dev --profile jnicamzn-sso-ec2
```

2. Review recent stack events:

```bash
aws cloudformation describe-stack-events --stack-name EC2Manager-dev --profile jnicamzn-sso-ec2
```

3. Compare CDK synthesis with deployed template
4. Clean up and redeploy if states are inconsistent

## Deployment Best Practices

### Pre-Deployment Checklist

- [ ] Run `npm run build` to compile TypeScript
- [ ] Verify AWS profile: `aws sts get-caller-identity --profile jnicamzn-sso-ec2`
- [ ] Check for orphaned resources from previous failed deployments
- [ ] Run `cdk synth --profile jnicamzn-sso-ec2` to validate synthesis
- [ ] Use explicit profile in all commands

### Recommended Deployment Commands

```bash
# Full deployment process
cd infrastructure
npm run build
npm run deploy:dev

# Alternative with explicit flags
cd infrastructure
npm run build
cdk deploy --profile jnicamzn-sso-ec2 --require-approval never
```

### Post-Deployment Verification

```bash
# Verify stack status
aws cloudformation describe-stacks --stack-name EC2Manager-dev --profile jnicamzn-sso-ec2

# Check stack outputs
cdk deploy --profile jnicamzn-sso-ec2 --outputs-file outputs.json
```

## Environment Information

- **AWS Account:** 357044226454
- **Region:** us-west-2
- **Profile:** jnicamzn-sso-ec2
- **Stack Name:** EC2Manager-dev
- **CDK Version:** 2.214.0

## Recent Fixes Applied

- **2025-09-14:** Fixed S3 AuditLogsBucket lifecycle rule (expiration: 365 days)
- **2025-09-14:** Documented build process requirement
- **2025-09-14:** Corrected AWS profile configuration usage
- **2025-09-14:** Implemented orphaned resource cleanup procedures
