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

## Frontend Deployment

### Web Application Deployment

After infrastructure deployment, deploy the frontend application:

```bash
# Deploy frontend to dev environment
python scripts/deploy-web.py dev --profile jnicamzn-sso-ec2

# Deploy frontend to prod environment
python scripts/deploy-web.py prod --profile jnicamzn-sso-ec2
```

### Frontend Deployment Features

- **Environment Variable Injection**: Automatically loads and injects Cognito configuration from deployed infrastructure
- **S3 Sync**: Efficiently syncs built files to S3 bucket with proper cache headers
- **CloudFront Invalidation**: Automatically invalidates cache after deployment
- **Deployment Verification**: Includes health checks and accessibility tests

### GitHub Actions Deployment

Automated deployment via GitHub Actions:

- **CI Pipeline**: Runs tests, linting, and builds on pull requests
- **CD Pipeline**: Deploys infrastructure and frontend on main branch pushes
- **Manual Deployment**: Supports manual deployment via workflow dispatch

## User Management

### Seeded Test Users

After deployment, seed test users for authentication testing:

```bash
# Seed users in dev environment
AWS_PROFILE=jnicamzn-sso-ec2 NODE_ENV=dev npx tsx scripts/seed-users.ts

# Seed users in prod environment
AWS_PROFILE=jnicamzn-sso-ec2 NODE_ENV=prod npx tsx scripts/seed-users.ts
```

### Default User Credentials

| Email                     | Password          | Role     | Access Level     |
| ------------------------- | ----------------- | -------- | ---------------- |
| `admin@ec2manager.com`    | `AdminPass123!`   | admin    | Full access      |
| `readonly@ec2manager.com` | `ReadPass123!`    | readonly | Read-only access |
| `manager@ec2manager.com`  | `ManagerPass123!` | admin    | Full access      |
| `viewer@ec2manager.com`   | `ViewerPass123!`  | readonly | Read-only access |

### Important Notes

- **Permanent Passwords**: Users are created with permanent passwords (no password change required on first login)
- **Verified Emails**: All user emails are pre-verified
- **Custom Roles**: Users have custom `role` attributes for access control

## Post-Deployment

After successful deployment:

1. **Note Stack Outputs**:
   - User Pool ID: `us-west-2_mDM8sap1x`
   - Client ID: `238u9sk9ds3k8be0qu2hahsvqi`
   - CloudFront URL: `https://d2pbh2fudgytg0.cloudfront.net`
   - S3 Bucket: `ec2-manager-web-dev-us-west-2`

2. **Update Environment Variables**: `.env.dev` should be updated with actual values
3. **Test Authentication**: Use provided test credentials to verify login flow
4. **Verify Resources**: Ensure all resources deployed to correct AWS account (`357044226454`)

## Security Notes

- Never commit AWS credentials to git
- Always use the enforced profile system
- Verify account ID before any destructive operations
- Keep deployment logs for audit purposes
