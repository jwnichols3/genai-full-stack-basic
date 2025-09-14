# Epic 3: Instance Management & Admin Actions

**Goal:** Enable administrative capabilities for managing EC2 instances, starting with the reboot functionality. This epic implements admin-only actions with proper authorization, confirmation workflows, audit logging, and CloudWatch metrics integration to provide a complete management experience for privileged users.

## Story 3.1: Implement Reboot Instance Lambda Function

**As a** system administrator,
**I want** backend capability to reboot EC2 instances,
**So that** I can resolve issues without AWS Console access.

**Acceptance Criteria:**
1. Lambda function created for POST /instances/{instanceId}/reboot endpoint
2. Function validates user role is 'admin' before proceeding
3. IAM role includes ec2:RebootInstances permission with resource constraints
4. Function calls EC2 RebootInstances API with proper error handling
5. Success response includes confirmation message and timestamp
6. Function handles instance state validation (can't reboot stopped instances)
7. Idempotency handled for duplicate reboot requests
8. Response includes expected time for instance to be available again

## Story 3.2: Add Reboot UI with Confirmation Dialog

**As a** admin user,
**I want** a safe, clear interface for rebooting instances with confirmation,
**So that** I don't accidentally disrupt services.

**Acceptance Criteria:**
1. Reboot button added to instance detail view (admin only)
2. Button styled with warning color (orange/red) to indicate impact
3. Clicking button opens Material-UI confirmation dialog
4. Dialog clearly states: instance ID, current state, impact warning
5. Dialog requires typing instance ID to confirm (prevents accidental clicks)
6. Cancel button closes dialog with no action
7. Confirm button disabled until instance ID typed correctly
8. Loading state during reboot operation with spinner
9. Success/failure message displayed after operation completes

## Story 3.3: Implement Audit Logging System

**As a** compliance officer,
**I want** all administrative actions logged with complete details,
**So that** we maintain accountability and can investigate issues.

**Acceptance Criteria:**
1. CloudWatch log group created specifically for audit logs
2. All admin actions log: timestamp, user email, action, target resource, result
3. Structured JSON logging format for easy querying
4. Correlation ID links audit logs to request logs
5. Failed authorization attempts logged with reason
6. Log retention configured for 30 days minimum
7. Logs include source IP and user agent information
8. Audit logs cannot be deleted or modified by application

## Story 3.4: Create Audit Log Viewer for Admins

**As a** admin user,
**I want** to view audit logs within the application,
**So that** I can track what actions have been taken.

**Acceptance Criteria:**
1. New route /audit-logs accessible only to admin users
2. Lambda function created to query CloudWatch Logs Insights
3. UI displays logs in paginated table with sorting
4. Filters available for: date range, user, action type, success/failure
5. Each log entry expandable to show full details
6. Export functionality to download logs as CSV
7. Real-time updates when new audit events occur
8. Search functionality for finding specific events

## Story 3.5: Integrate CloudWatch Metrics Display

**As a** user,
**I want** to see instance performance metrics,
**So that** I can make informed decisions about instance management.

**Acceptance Criteria:**
1. Lambda function queries CloudWatch for instance metrics
2. Metrics include: CPU utilization, network in/out, disk I/O
3. Detail view shows metrics graphs for last 1hr, 6hr, 24hr
4. Graphs use Material-UI charting components or recharts
5. Loading state while fetching metrics data
6. Graceful handling when metrics unavailable
7. Hover on graphs shows exact values at timestamp
8. Metrics refresh automatically every minute when viewing

## Story 3.6: Add Instance Action History

**As a** user,
**I want** to see recent actions taken on an instance,
**So that** I understand what changes have been made.

**Acceptance Criteria:**
1. Instance detail view includes "Recent Actions" section
2. Shows last 10 actions taken on this specific instance
3. Actions pulled from audit logs filtered by instance ID
4. Each action shows: timestamp, user, action type, result
5. Failed actions highlighted in red
6. Relative timestamps ("2 hours ago") with full timestamp on hover
7. Link to full audit log filtered for this instance
8. Section hidden for read-only users if no visible actions

## Story 3.7: Implement Action Rate Limiting

**As a** platform administrator,
**I want** admin actions rate-limited per user,
**So that** we prevent accidental automation or abuse.

**Acceptance Criteria:**
1. DynamoDB table created for tracking user action counts
2. Rate limit of 10 admin actions per user per minute
3. Lambda functions check rate limit before executing actions
4. Clear error message when rate limit exceeded
5. Rate limit counter resets after time window
6. Different limits configurable per environment
7. Admin bypass mechanism for emergency situations
8. Metrics published for rate limit violations
