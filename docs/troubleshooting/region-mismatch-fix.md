# Region Mismatch Issue Fix

## Issue Summary

**Problem**: Dashboard showed "No instances found" even though EC2 instances existed in the AWS account.

**Root Cause**: Lambda function was querying the wrong AWS region (us-east-1) instead of the correct region (us-west-2) where instances were located.

## Technical Details

### Symptoms

- API requests returned 200 OK with empty results
- Lambda logs showed: `region: 'us-east-1', instanceCount: 0`
- Frontend displayed "No instances found" message
- AWS Console showed instances in us-west-2 region

### Investigation Steps

1. **Checked API authentication** - Working correctly (JWT tokens validated)
2. **Verified IAM permissions** - Found and fixed permission issue with condition policy
3. **Examined Lambda logs** - Revealed region mismatch in successful requests
4. **Identified default region fallback** - Lambda function defaulted to us-east-1

### Root Cause Analysis

**Lambda Function Logic** (`apps/api/src/functions/instances/list.ts`):

```typescript
const getRegionFromQuery = (event: APIGatewayProxyEvent): string => {
  const queryRegion = event.queryStringParameters?.region;
  return queryRegion ?? 'us-east-1'; // ← PROBLEM: Wrong default
};
```

**Frontend Code** (`apps/web/src/hooks/useInstances.ts`):

```typescript
// Frontend was not passing region parameter
const data = await ec2Service.listInstances(filters); // No region specified
```

## Solution

### Fix Applied

Modified the frontend to automatically include the correct region from environment configuration:

**File**: `apps/web/src/hooks/useInstances.ts`

```typescript
import { config } from '../config/environment';

const fetchInstances = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    // Always include the configured AWS region
    const filtersWithRegion = {
      ...filters,
      region: filters.region || config.cognito.region, // Uses us-west-2
    };
    const data = await ec2Service.listInstances(filtersWithRegion);
    setInstances(data);
    setLastUpdated(new Date());
  } catch (err) {
    console.error('Failed to fetch instances:', err);
    setError(err instanceof Error ? err.message : 'Failed to fetch instances');
  } finally {
    setLoading(false);
  }
}, [filters]);
```

### Additional Fix Required

**IAM Permission Issue**: Removed problematic condition from Lambda execution role that was blocking EC2 API calls.

**File**: `infrastructure/lib/stacks/api-stack.ts`

```typescript
// Removed this condition that was causing permission issues:
// conditions: {
//   StringEquals: {
//     'aws:RequestedRegion': this.region,
//   },
// },
```

## Verification

### Before Fix

```json
{
  "region": "us-east-1",
  "instanceCount": 0
}
```

### After Fix

```json
{
  "region": "us-west-2",
  "instanceCount": 2
}
```

## Prevention

### Environment Configuration

The fix leverages existing environment configuration:

**File**: `apps/web/src/config/environment.ts`

```typescript
cognito: {
  region: getEnvironmentVariable('VITE_AWS_REGION', 'us-west-2'),
}
```

### Alternative Solutions Considered

1. **Change Lambda default** - Could break other regions
2. **Hard-code region** - Less flexible
3. **Environment variable** - ✅ **Chosen solution** - Uses existing config pattern

## Testing

### Manual Testing

1. Refresh dashboard page
2. Verify instances appear in the UI
3. Check Lambda logs for correct region usage
4. Confirm all instance states and details display correctly

### Automated Testing

Consider adding integration tests that verify:

- Region parameter is passed correctly from frontend
- Lambda function respects region parameter
- Different regions can be queried

## Related Issues

- IAM permission condition blocking EC2 API calls
- Default region configuration in Lambda functions
- Frontend environment configuration patterns

## Date

September 23, 2025

## Contributors

- BMad Master (AI Assistant)
- jwnichols3 (User)
