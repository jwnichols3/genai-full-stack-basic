# Deployment Guide

This guide explains how to safely deploy the EC2 Manager infrastructure using the enforced profile system.

## ⚠️ CRITICAL: Profile Enforcement

**ALL DEPLOYMENTS MUST USE THE CORRECT AWS PROFILE: `jnicamzn-sso-ec2`**

This repository has a history of accidental deployments to wrong AWS accounts. To prevent this, we've implemented mandatory profile enforcement scripts.

### Enforced Profile Details

- **Profile Name**: `jnicamzn-sso-ec2`
- **AWS Account ID**: `357044226454`
- **Region**: `us-west-2`

## Safe Deployment Scripts

### From Project Root

```bash
# Deploy to dev environment (RECOMMENDED)
npm run deploy:dev

# Deploy to production environment
npm run deploy:prod

# Validate profile and account before deployment
npm run infra:validate

# Destroy dev environment (DANGEROUS)
npm run destroy:dev

# Destroy prod environment (EXTREMELY DANGEROUS)
npm run destroy:prod
```

### From Infrastructure Directory

```bash
cd infrastructure

# Deploy to dev environment
npm run deploy:dev

# Deploy to production environment
npm run deploy:prod

# Validate profile and account
npm run validate

# Destroy environments
npm run destroy:dev
npm run destroy:prod
```

### Direct Script Usage

```bash
# Deploy to dev
./scripts/deploy.sh deploy dev

# Deploy to prod
./scripts/deploy.sh deploy prod

# Validate profile only
./scripts/deploy.sh validate

# Build only
./scripts/deploy.sh build

# Destroy dev (with confirmation prompt)
./scripts/deploy.sh destroy dev
```

## Safety Features

### 1. Profile Validation

- Automatically validates AWS profile exists
- Verifies account ID matches expected value
- Fails fast if wrong profile is detected

### 2. Account ID Verification

- Double-checks account ID before every deployment
- Prevents deployment to wrong AWS accounts
- Shows current account and profile in output

### 3. Blocked Commands

- `npm run deploy` (generic) is blocked
- `npm run destroy` (generic) is blocked
- Forces explicit environment selection

### 4. Pre-deployment Checks

- Validates AWS credentials
- Builds project before deployment
- Confirms profile configuration

## Emergency Cleanup

If resources were accidentally deployed to the wrong account:

```bash
# Clean up wrong account deployment (161521808930)
npm run cleanup:wrong-account
```

This script will:

1. Empty all S3 buckets to prevent deletion failures
2. Delete the CloudFormation stack
3. Wait for cleanup completion

## Deployment Process

1. **Validate Profile**:

   ```bash
   npm run infra:validate
   ```

2. **Deploy to Dev**:

   ```bash
   npm run deploy:dev
   ```

3. **Test Deployment**:
   - Verify stack outputs
   - Check Cognito User Pool
   - Test API endpoints

4. **Deploy to Prod** (if needed):
   ```bash
   npm run deploy:prod
   ```

## Troubleshooting

### Profile Not Found

If you get "profile not found" errors:

```bash
aws configure list-profiles | grep jnicamzn-sso-ec2
```

### Wrong Account ID

If account ID doesn't match:

1. Check AWS profile configuration
2. Verify SSO session is active
3. Run `aws sso login --profile jnicamzn-sso-ec2`

### Stack Already Exists

If deployment fails due to existing stack:

1. Check which account the stack is in
2. Use cleanup script if in wrong account
3. Update existing stack if in correct account

## CDK Bootstrap

Ensure CDK is bootstrapped in the target account:

```bash
npx cdk bootstrap --profile jnicamzn-sso-ec2
```

## Environment Variables

The deployment scripts automatically handle:

- AWS profile selection
- Account ID validation
- Region configuration (us-west-2)
- Environment context

No manual environment variable setup required.

## Post-Deployment

After successful deployment:

1. Note the stack outputs (User Pool ID, Client ID, etc.)
2. Update any dependent configurations
3. Test authentication flows
4. Verify all resources in correct account

## Security Notes

- Never commit AWS credentials to git
- Always use the enforced profile system
- Verify account ID before any destructive operations
- Keep deployment logs for audit purposes
