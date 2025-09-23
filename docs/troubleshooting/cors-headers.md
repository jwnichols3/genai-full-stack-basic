# CORS Headers Troubleshooting Guide

## Overview

Cross-Origin Resource Sharing (CORS) is a security feature implemented by web browsers that restricts how a web page from one domain can access resources from another domain. In our EC2 Manager application, the frontend (CloudFront) makes API calls to a different domain (API Gateway), which requires proper CORS configuration.

## Common CORS Issues

### 1. Custom Headers Not Allowed

**Error Message:**

```
Access to fetch at 'https://api-domain.com/endpoint' from origin 'https://frontend-domain.com'
has been blocked by CORS policy: Request header field 'custom-header-name' is not allowed
by Access-Control-Allow-Headers in preflight response.
```

**Root Cause:**

- Adding custom headers to API requests without updating backend CORS configuration
- API Gateway must explicitly allow custom headers in `Access-Control-Allow-Headers`

**Resolution Options:**

1. **Remove Custom Header (Recommended for non-essential headers):**

   ```typescript
   // ❌ AVOID: Adding custom headers without backend coordination
   const response = await fetch(url, {
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
       'X-Custom-Header': 'value', // This will cause CORS issues
     },
   });

   // ✅ CORRECT: Use only standard/allowed headers
   const response = await fetch(url, {
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
   });
   ```

2. **Update Backend CORS Configuration (If header is essential):**
   - Coordinate with backend team to add custom header to CORS allow list
   - Update API Gateway CORS settings to include the new header

### 2. Preflight Request Failures

**Error Message:**

```
Access to fetch at 'https://api-domain.com/endpoint' from origin 'https://frontend-domain.com'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

**Root Cause:**

- Browser sends OPTIONS request before actual request (preflight)
- Backend doesn't handle OPTIONS requests properly
- Missing required CORS headers in preflight response

## Standard Headers That Are Usually Allowed

### Safe Headers (No CORS Issues)

- `Accept`
- `Accept-Language`
- `Content-Language`
- `Content-Type` (with restrictions)

### Common Custom Headers That Need Backend Permission

- `Authorization` (usually configured)
- `X-API-Key`
- `X-Request-ID`
- `X-Correlation-ID`
- Any custom application headers

## Best Practices

### 1. Frontend Development

- **Always check existing CORS configuration** before adding custom headers
- **Use standard headers when possible** (Authorization, Content-Type)
- **Test API calls locally** before deploying to catch CORS issues early
- **Coordinate with backend team** for any new custom headers

### 2. Error Handling Without Custom Headers

```typescript
// ✅ GOOD: Generate correlation IDs without custom headers
const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log('API call correlation ID:', correlationId);

// Use URL parameters or request body for tracking instead of headers
const url = `${API_BASE_URL}/endpoint?correlation-id=${correlationId}`;
```

### 3. Debugging CORS Issues

1. **Check Browser Console** for specific CORS error messages
2. **Inspect Network Tab** to see preflight OPTIONS requests
3. **Verify Backend CORS Configuration** with backend team
4. **Test with Simple Headers First** to isolate the issue

### 4. Development Workflow

```typescript
// 1. Start with minimal headers
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add authentication if needed
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
});

// 3. Only add custom headers after backend coordination
// (Coordinate with backend team first!)
```

## Incident Resolution Checklist

When encountering CORS issues:

- [ ] Identify the specific header causing the issue
- [ ] Determine if the header is essential for functionality
- [ ] If non-essential: Remove the header
- [ ] If essential: Coordinate with backend team to update CORS
- [ ] Test the fix locally if possible
- [ ] Deploy and verify resolution
- [ ] Document the incident and resolution

## Related Configuration Files

- **Frontend API Service**: `apps/web/src/services/ec2.ts`
- **Backend CORS Config**: Contact backend team for API Gateway settings
- **Environment Variables**: Check `VITE_API_URL` configuration

## Historical Issues

### Issue #1: X-Request-ID Header (Story 2.6)

- **Date**: 2025-09-23
- **Problem**: Added `X-Request-ID` header for error correlation without backend support
- **Impact**: All API calls failed with CORS errors
- **Resolution**: Removed non-essential header
- **Files**: `apps/web/src/services/ec2.ts`
- **Lesson**: Always coordinate custom headers with backend team

## Contact Information

- **Backend Team**: Contact for CORS configuration changes
- **DevOps Team**: Contact for API Gateway CORS settings
- **Frontend Team**: Responsible for header usage in API calls

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [AWS API Gateway CORS Configuration](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
