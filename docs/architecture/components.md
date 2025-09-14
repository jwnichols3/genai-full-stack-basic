# Components

## Frontend Application
**Responsibility:** React SPA providing user interface for EC2 instance management with real-time updates and responsive design

**Key Interfaces:**
- HTTP REST API calls to API Gateway endpoints
- WebSocket connection for real-time instance state updates (future enhancement)
- Cognito SDK integration for authentication flows

**Dependencies:** API Gateway REST API, AWS Cognito, CloudFront CDN

**Technology Stack:** React 18.2+, TypeScript 5.3+, Material-UI 5.15+, Vite 5.0+

## API Gateway
**Responsibility:** Single entry point for all API requests with request validation, rate limiting, and Cognito authorization

**Key Interfaces:**
- REST endpoints for instance operations
- JWT token validation via Cognito authorizer
- Request/response transformation and validation

**Dependencies:** AWS Cognito (authorization), Lambda Functions (backend logic)

**Technology Stack:** AWS API Gateway REST API, Cognito Authorizer, Request Validators

## Lambda Functions
**Responsibility:** Serverless compute layer executing business logic for instance management, metrics retrieval, and audit logging

**Key Interfaces:**
- Event handlers for API Gateway requests
- AWS SDK calls to EC2, CloudWatch, and DynamoDB
- Structured JSON responses with error handling

**Dependencies:** EC2 API, CloudWatch API, DynamoDB, IAM roles

**Technology Stack:** Node.js 20.x runtime, TypeScript, AWS SDK v3

## Authentication Service (Cognito)
**Responsibility:** User authentication, authorization, and session management with role-based access control

**Key Interfaces:**
- User pool for authentication
- JWT token generation and validation
- Password policies and MFA support (future)

**Dependencies:** None (managed service)

**Technology Stack:** AWS Cognito User Pool with email-based authentication

## Audit Service (DynamoDB)
**Responsibility:** Immutable audit trail storage for all administrative actions with high-performance queries

**Key Interfaces:**
- Put operations for new audit entries
- Query operations by userId, timestamp, or action
- GSI for efficient filtering

**Dependencies:** Lambda Functions (writers)

**Technology Stack:** DynamoDB with on-demand capacity, single table design

## Static Hosting (S3 + CloudFront)
**Responsibility:** Global distribution of frontend assets with caching, compression, and HTTPS termination

**Key Interfaces:**
- S3 bucket for static file storage
- CloudFront distribution with custom domain
- Cache invalidation API for deployments

**Dependencies:** S3 bucket (origin)

**Technology Stack:** S3 static website hosting, CloudFront CDN with OAI

## Monitoring Service (CloudWatch)
**Responsibility:** Centralized logging, metrics collection, and operational dashboards for system observability

**Key Interfaces:**
- Log streams from Lambda functions
- Custom metrics API
- Dashboard API for visualization
- Alarms for operational thresholds

**Dependencies:** All Lambda functions, API Gateway

**Technology Stack:** CloudWatch Logs, Metrics, Dashboards, and Alarms
