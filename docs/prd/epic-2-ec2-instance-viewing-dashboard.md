# Epic 2: EC2 Instance Viewing & Dashboard

**Goal:** Deliver the core value proposition by enabling users to view and monitor EC2 instances through an intuitive dashboard interface. This epic implements the complete read-only functionality with role-based access control, real-time status updates, and responsive UI components that serve both admin and read-only users.

## Story 2.1: Create API Gateway and Lambda Base Infrastructure

**As a** backend developer,
**I want** API Gateway and Lambda functions properly configured,
**So that** the frontend can communicate with backend services.

**Acceptance Criteria:**

1. API Gateway REST API created with proper stage configuration (dev/prod)
2. CORS configured correctly for CloudFront distribution origin
3. Lambda execution role created with necessary IAM permissions for CloudWatch logs
4. API Gateway can successfully invoke Lambda functions
5. Request/response logging enabled in CloudWatch
6. API endpoints follow RESTful conventions (/api/v1/instances)
7. Throttling configured (100 req/s rate, 200 burst limit)
8. API Gateway deployment automated through CDK

## Story 2.2: Implement Lambda Authorizer with Role Validation

**As a** security administrator,
**I want** API requests authorized based on Cognito JWT tokens and user roles,
**So that** only authenticated users can access the API.

**Acceptance Criteria:**

1. Lambda authorizer function created to validate Cognito JWT tokens
2. Authorizer extracts and validates user role from custom:role attribute
3. API Gateway configured to use the Lambda authorizer for all endpoints
4. Authorizer caches results for performance (5-minute TTL)
5. Unauthorized requests return 401 with appropriate error message
6. Authorizer passes user context (email, role) to downstream Lambdas
7. Token expiration properly handled with clear error messages
8. Authorizer includes correlation ID for request tracing

## Story 2.3: Implement List Instances Lambda Function

**As a** user,
**I want** to retrieve a list of EC2 instances in my configured region,
**So that** I can see all instances at a glance.

**Acceptance Criteria:**

1. Lambda function created with AWS SDK v3 for EC2 client
2. Function queries EC2 DescribeInstances API with proper error handling
3. IAM role includes ec2:DescribeInstances permission with appropriate resource scope
4. Response formatted as JSON with instance details (id, type, state, IPs, launch time, tags)
5. Function handles pagination for accounts with many instances
6. Empty results return empty array with 200 status (not error)
7. Region parameter accepted from query string (defaults to us-east-1)
8. Response includes proper cache headers for API Gateway caching

## Story 2.4: Create Dashboard UI with Instance Grid

**As a** user,
**I want** a dashboard displaying all EC2 instances in a clear, organized layout,
**So that** I can quickly assess the status of my infrastructure.

**Acceptance Criteria:**

1. Dashboard page created with Material-UI DataGrid or card layout
2. Loading state displayed while fetching instance data
3. Each instance shows: ID, Name tag, Type, State (with color coding), Public IP, Private IP
4. State colors implemented (green=running, yellow=pending, red=stopped, gray=terminated)
5. Grid supports sorting by any column
6. Grid supports filtering/search by instance ID, name, or state
7. Responsive design adapts for mobile/tablet/desktop views
8. Empty state message when no instances exist
9. Auto-refresh every 30 seconds with visual indicator

## Story 2.5: Implement Instance Detail View

**As a** user,
**I want** to view detailed information about a specific instance,
**So that** I can understand its configuration and status.

**Acceptance Criteria:**

1. Clicking an instance navigates to detail view (/instances/{instanceId})
2. Detail API endpoint created (GET /instances/{instanceId})
3. Lambda function retrieves comprehensive instance details
4. UI displays all instance attributes in organized sections
5. Tags displayed in a readable table format
6. Network information clearly presented (VPC, subnet, security groups)
7. Launch time shown with relative time (e.g., "2 days ago")
8. Back navigation returns to dashboard maintaining scroll position
9. Loading and error states properly handled

## Story 2.6: Add Error Handling and User Feedback

**As a** user,
**I want** clear feedback when operations succeed or fail,
**So that** I understand what's happening with my requests.

**Acceptance Criteria:**

1. Global error boundary implemented to catch React errors
2. API error interceptor displays user-friendly messages
3. Toast notifications configured for success/error feedback
4. Network failure messages suggest checking connection
5. 401 errors redirect to login with session expired message
6. 403 errors show "insufficient permissions" with role context
7. Rate limiting errors show appropriate retry message
8. Loading spinners consistent across all async operations

## Story 2.7: Implement Role-Based UI Adaptation

**As a** read-only user,
**I want** to see only the features available to my role,
**So that** the interface isn't cluttered with unavailable actions.

**Acceptance Criteria:**

1. User role retrieved from JWT token and stored in React context
2. Admin-only UI elements hidden for read-only users
3. Navigation menu adapts based on user role
4. Dashboard shows role indicator in header
5. Tooltip on disabled features explains permission requirement
6. Role context available throughout component tree
7. UI prevents attempting unauthorized actions client-side
8. Profile section displays current user email and role
