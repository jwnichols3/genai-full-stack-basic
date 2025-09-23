# Common Development Issues & Solutions

This document captures common issues encountered during development and their solutions to help future development efforts.

## Table of Contents

1. [API Development Issues](#api-development-issues)
2. [Frontend Development Issues](#frontend-development-issues)
3. [Deployment Issues](#deployment-issues)
4. [AWS Region Configuration](#aws-region-configuration)
5. [Authentication & Authorization](#authentication--authorization)

## API Development Issues

### Issue: Lambda Function Default Region Mismatch

**Problem**: Lambda functions default to `us-east-1` but infrastructure is deployed in `us-west-2`, causing "resource not found" errors.

**Symptoms**:

- 404 errors for existing AWS resources
- "Instance not found" errors when resources clearly exist
- API calls succeed with CLI but fail in Lambda

**Solution**:

```typescript
// In Lambda functions, always default to the same region as your infrastructure
const getRegionFromQuery = (event: APIGatewayProxyEvent): string => {
  const queryRegion = event.queryStringParameters?.region;
  return queryRegion ?? 'us-west-2'; // Match your infrastructure region
};
```

**Prevention**:

- Always check CDK deployment region and match Lambda defaults
- Add explicit logging for region configuration in Lambda functions
- Use environment variables for region configuration when possible

### Issue: IAM Permissions vs API Gateway Authorization

**Problem**: Distinguishing between IAM permission issues (500 errors) and API Gateway authorization issues (403 errors).

**Symptoms**:

- 403 errors that could be either auth token issues or IAM permissions
- Unclear error messages in logs

**Solution**:

- Check CloudWatch logs for the specific Lambda function
- Look for AWS SDK errors (IAM issues) vs authorization failures (token issues)
- Test IAM permissions directly with AWS CLI using same credentials

**Debug Steps**:

1. Check Lambda function logs: `/aws/lambda/function-name`
2. Verify IAM role has required permissions
3. Test API with fresh authentication token
4. Verify token format and expiration

## Frontend Development Issues

### Issue: React DOM Nesting Validation Warnings

**Problem**: Invalid HTML structure causing React warnings about DOM nesting.

**Symptoms**:

```
Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>
```

**Common Causes**:

- Placing `<Chip>`, `<Button>`, or other block elements inside `<Typography>` components
- `<Typography>` renders as `<p>` by default, which cannot contain block elements

**Solution**:

```typescript
// ❌ Wrong - Chip inside Typography
<Typography variant="h6">
  Title
  <Chip label="count" />
</Typography>

// ✅ Correct - Use Box with flexbox
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="h6">Title</Typography>
  <Chip label="count" />
</Box>
```

**Prevention**:

- Never nest interactive components inside `<Typography>`
- Use `<Box>` with flexbox for layouts containing mixed elements
- Consider using `component="div"` on Typography if needed

### Issue: Environment Variable Configuration

**Problem**: Frontend not picking up correct API URLs or configuration.

**Solution**:

- Verify `.env.dev` and `.env.prod` files are correctly configured
- Check that `VITE_` prefix is used for client-side variables
- Ensure deployment script loads correct environment file

## Deployment Issues

### Issue: CDK Stack Dependencies

**Problem**: Deploying stacks in wrong order causing dependency failures.

**Solution**:

- Always deploy base infrastructure first: `EC2Manager-dev`
- Then deploy API stack: `EC2Manager-Api-dev`
- Finally deploy web stack: `EC2Manager-Web-dev`

### Issue: CloudFront Cache Issues

**Problem**: Frontend changes not visible after deployment.

**Solution**:

- Deployment script automatically invalidates cache
- For manual invalidation: `aws cloudfront create-invalidation --distribution-id XXX --paths "/*"`
- Wait for invalidation to complete (usually 1-2 minutes)

## AWS Region Configuration

### Best Practices for Multi-Region Support

1. **Consistent Region Defaults**:

   ```typescript
   // Use same default region across all services
   const DEFAULT_REGION = 'us-west-2';
   ```

2. **Environment-Based Configuration**:

   ```typescript
   const region = process.env.AWS_REGION || 'us-west-2';
   ```

3. **Frontend Region Handling**:
   ```typescript
   // Always pass region when available
   const instances = await ec2Service.listInstances({ region: selectedRegion });
   ```

## Authentication & Authorization

### Issue: Token Expiration and Refresh

**Problem**: Users getting 403 errors due to expired tokens.

**Symptoms**:

- Intermittent 403 errors
- Errors appearing after periods of inactivity
- "JWT string does not consist of exactly 3 parts" in logs

**Solution**:

- Implement automatic token refresh in frontend
- Add proper error handling for token expiration
- Clear storage and redirect to login on auth failures

### Issue: ID Token vs Access Token

**Problem**: Using wrong token type for API authorization.

**Solution**:

- Use ID tokens for custom API authorization (contains user claims)
- Use access tokens for AWS service authorization
- Verify token type in authorizer configuration

## Development Workflow Best Practices

### 1. Pre-Development Checklist

Before starting new features:

- [ ] Verify all existing tests pass
- [ ] Check current region configuration
- [ ] Ensure environment variables are up to date
- [ ] Review related existing code for patterns

### 2. During Development

- Add comprehensive logging to Lambda functions for debugging
- Test with real AWS resources, not just mocks
- Verify CORS configuration for new endpoints
- Check HTML validation in browser console

### 3. Pre-Deployment Checklist

- [ ] Run `npm run lint` and `npm run typecheck`
- [ ] Verify build succeeds without warnings
- [ ] Test in development environment
- [ ] Check for console errors/warnings
- [ ] Verify all required environment variables are set

### 4. Post-Deployment Verification

- [ ] Test functionality in deployed environment
- [ ] Check CloudWatch logs for errors
- [ ] Verify no console errors in browser
- [ ] Test error scenarios (invalid input, network failures)

## Quick Reference Commands

### Debugging Commands

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/function-name"

# Get recent errors
aws logs filter-log-events --log-group-name "/aws/lambda/function-name" --filter-pattern "ERROR"

# Verify CDK stacks
npx cdk list

# Check environment variables
npm run env:check
```

### Deployment Commands

```bash
# Backend deployment
npx cdk deploy StackName --profile jnicamzn-sso-ec2 --require-approval never

# Frontend deployment
source venv/bin/activate && python scripts/deploy-web.py dev

# Build and test
npm run build && npm run test
```

## Common Error Patterns

### CORS Errors

- Usually indicates missing backend deployment
- Check that API Gateway has the endpoint
- Verify CORS headers in Lambda responses

### 403 Forbidden

- Could be expired tokens (logout/login)
- Could be IAM permissions (check Lambda logs)
- Could be wrong region (check logs for region info)

### 404 Not Found

- Check API Gateway has the route
- Verify path parameters match expected format
- Check region configuration

### 500 Internal Server Error

- Always check Lambda function logs
- Usually IAM permissions or code errors
- Check for unhandled exceptions

## Story-Specific Lessons

### Story 2.5 - Instance Detail View

**Key Learnings**:

1. Default region configuration is critical for resource discovery
2. HTML nesting validation matters for production quality
3. Comprehensive logging helps debug API issues quickly
4. Testing with real instance IDs reveals region mismatches

**Patterns Established**:

- Enhanced logging for region configuration in Lambda functions
- Proper HTML structure for Material-UI components
- Systematic approach to CORS and API endpoint issues

---

## Contributing to This Document

When encountering new issues:

1. Document the problem with symptoms
2. Include the exact error messages
3. Provide the working solution
4. Add prevention strategies
5. Update relevant commands or patterns
