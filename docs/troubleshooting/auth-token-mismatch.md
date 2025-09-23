# Troubleshooting: Authentication Token Type Mismatch

## Quick Fix Summary

**Problem**: Users can login successfully but immediately get redirected back to login page when trying to access the dashboard.

**Solution**: Switch from using access tokens to ID tokens for API authentication.

## Symptoms

- ✅ Login form accepts credentials without error
- ✅ Cognito returns 200 OK with valid tokens
- ❌ Dashboard fails to load
- ❌ API calls return 401 Unauthorized
- ❌ User redirected back to /login
- ❌ Authorizer logs show "JWT string does not consist of exactly 3 parts"

## Root Cause

The API Gateway Custom Authorizer and frontend were using incompatible token types:

| Component | Expected | Actual | Result |
|-----------|----------|---------|---------|
| Authorizer | Access Token with user claims | Access Token (limited claims) | Missing claims → 401 |
| Frontend | Sends Access Token | Access Token has no user claims | Authorization fails |

## The Fix

### Step 1: Update Authorizer to Use ID Tokens

**File**: `apps/api/src/functions/auth/authorizer.ts`

```typescript
// Change from 'access' to 'id'
verifier = CognitoJwtVerifier.create({
  userPoolId: config.userPoolId,
  tokenUse: 'id',  // ← CHANGE THIS
  clientId: config.clientId,
});
```

### Step 2: Update Frontend to Send ID Tokens

**File**: `apps/web/src/services/ec2.ts`

```typescript
private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getIdToken();  // ← CHANGE FROM getAccessToken()
  // ... rest of the method
}
```

### Step 3: Add Helper Method to Auth Service

**File**: `apps/web/src/services/auth.ts`

```typescript
/**
 * Get current ID token (contains user claims)
 */
getIdToken(): string | null {
  return this.idToken;
}
```

### Step 4: Deploy Changes

```bash
# Deploy backend
cd infrastructure
AWS_PROFILE=your-profile npx cdk deploy EC2Manager-Api-dev

# Deploy frontend
cd ..
python3 scripts/deploy-web.py dev
```

## Why This Works

### Access Token vs ID Token

**Access Token**:
```json
{
  "sub": "user-id",
  "token_use": "access",
  "scope": "openid email",
  "auth_time": 1234567890,
  "exp": 1234567890,
  "client_id": "app-client-id"
  // Limited claims - no user attributes
}
```

**ID Token**:
```json
{
  "sub": "user-id",
  "token_use": "id",
  "email": "user@example.com",
  "custom:role": "admin",        // ← Custom claims
  "given_name": "John",          // ← User attributes
  "family_name": "Doe",          // ← User attributes
  "email_verified": true,
  "auth_time": 1234567890,
  "exp": 1234567890
}
```

The authorizer needs `email` and `custom:role` claims to:
1. Identify the user
2. Generate proper IAM policies
3. Pass user context to Lambda functions

## Verification Steps

### 1. Check Token in Browser Console

```javascript
// After login, check which token has user claims
const idToken = sessionStorage.getItem('id_token');
const accessToken = sessionStorage.getItem('access_token');

// Decode and compare
const decode = (token) => JSON.parse(atob(token.split('.')[1]));

console.log('ID Token has email?', decode(idToken).email);        // ✅ Should be present
console.log('Access Token has email?', decode(accessToken).email); // ❌ Will be undefined
```

### 2. Check Network Tab

1. Open Developer Tools → Network tab
2. Login to the application
3. Find request to `/api/v1/instances`
4. Check Authorization header:
   - Should start with `Bearer eyJ...`
   - Token should decode to show email and custom:role

### 3. Check CloudWatch Logs

```bash
# Check authorizer logs
aws logs tail /aws/lambda/ec2-manager-authorizer-dev --follow

# Look for successful authorization
# "Authorization successful" with email and role in the log
```

## Common Mistakes

### ❌ Don't Use Access Token for User Claims
```typescript
// WRONG - Access token doesn't have user claims
const token = authService.getAccessToken();
```

### ❌ Don't Configure Authorizer for Wrong Token Type
```typescript
// WRONG - If you need user claims
tokenUse: 'access'
```

### ✅ Do Use ID Token When You Need User Identity
```typescript
// CORRECT - ID token has full user profile
const token = authService.getIdToken();
```

### ✅ Do Match Token Types Between Frontend and Backend
```typescript
// Frontend sends ID token
authService.getIdToken()

// Backend expects ID token
tokenUse: 'id'
```

## Prevention

1. **Document Token Usage**: Clearly document which token type each service expects
2. **Add Tests**: Test that correct token type is sent in API calls
3. **Type Safety**: Create TypeScript types for different token payloads
4. **Logging**: Add debug logs showing token type being used (remove in production)

## Related Issues

- 403 Forbidden after fixing 401: Check IAM policy generation in authorizer
- CORS errors: Ensure Gateway Responses include CORS headers
- Token expiration: Implement refresh token flow

## References

- [Cognito Token Types](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html#amazon-cognito-user-pools-using-the-id-token)
- [API Gateway Custom Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html)