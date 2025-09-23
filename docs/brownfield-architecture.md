# EC2 Instance Manager Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the EC2 Instance Manager codebase, including technical patterns, implementation decisions, and real-world constraints. It serves as a reference for AI agents working on enhancements to this AWS serverless application.

### Document Scope

Focused on areas relevant to the EC2 Instance Management Platform as defined in the PRD. The application enables monitoring and management of EC2 instances through a web interface with role-based access control.

### Change Log

| Date       | Version | Description                          | Author      |
| ---------- | ------- | ------------------------------------ | ----------- |
| 2025-01-23 | 1.0     | Initial brownfield analysis         | BMad Master |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `apps/web/src/main.tsx` - React application entry point
- **Configuration**:
  - `apps/web/src/config/environment.ts` - Frontend environment config
  - `infrastructure/config/environment-config.ts` - CDK deployment configs
- **Core Business Logic**:
  - `apps/api/src/functions/auth/authorizer.ts` - JWT token validation
  - `apps/api/src/functions/instances/list.ts` - EC2 instance listing
- **API Definitions**: REST API defined in `infrastructure/lib/stacks/api-stack.ts`
- **Authentication**: `apps/web/src/services/auth.ts` - Cognito integration
- **Key Components**:
  - `apps/web/src/pages/Dashboard.tsx` - Main instance dashboard
  - `apps/web/src/components/instances/InstanceTable.tsx` - DataGrid implementation

### Enhancement Impact Areas (Based on PRD)

For implementing remaining Epic 3 (Instance Management) and Epic 4 (Monitoring):
- **New Lambda Functions Needed**: `apps/api/src/functions/instances/reboot.ts`, `stop.ts`, `start.ts`
- **UI Components to Modify**: `InstanceTable.tsx` for action buttons
- **New Components Required**: Confirmation dialogs, metrics charts
- **Infrastructure Changes**: DynamoDB table for audit logs, CloudWatch dashboard

## High Level Architecture

### Technical Summary

A serverless AWS application built as a monorepo, providing web-based EC2 instance management with Cognito authentication, Lambda-based API, and React frontend delivered via CloudFront.

### Actual Tech Stack (from package.json files)

| Category       | Technology        | Version   | Notes                                    |
| -------------- | ----------------- | --------- | ---------------------------------------- |
| Runtime        | Node.js           | 20.x      | Lambda runtime                          |
| Frontend       | React             | 18.2.0    | With TypeScript strict mode             |
| UI Framework   | Material-UI       | 5.15.21+  | Full component library                  |
| Build Tool     | Vite              | 5.0.8     | Fast HMR, optimized production builds   |
| Backend        | AWS Lambda        | Node 20.x | Serverless functions                    |
| Auth           | AWS Cognito       | SDK v3    | User pools with custom attributes       |
| Database       | None currently    | N/A       | DynamoDB planned for audit logs         |
| Testing        | Jest              | 29.7.0    | With React Testing Library              |
| E2E Testing    | Playwright        | 1.49.1    | Cross-browser testing                   |
| IaC            | AWS CDK           | 2.173.4   | TypeScript-based infrastructure         |
| Package Mgmt   | npm               | 10.x      | Workspaces for monorepo                 |

### Repository Structure Reality Check

- **Type**: Monorepo with npm workspaces
- **Package Manager**: npm with workspaces configuration
- **Notable Decisions**:
  - Shared packages for common types/configs
  - Python deployment scripts wrapping CDK
  - Environment-specific config files pattern

## Source Tree and Module Organization

### Project Structure (Actual)

```text
genai-full-stack-basic/
├── apps/
│   ├── api/                      # Lambda functions (NOTE: minimal error recovery)
│   │   ├── src/functions/
│   │   │   ├── auth/             # Authentication functions
│   │   │   │   └── authorizer.ts # CRITICAL: Uses ID tokens, not access tokens
│   │   │   └── instances/        # EC2 management functions
│   │   │       ├── list.ts      # Fetches EC2 instances
│   │   │       └── check.ts     # Health check endpoint
│   │   └── tests/unit/          # Jest tests (good coverage)
│   └── web/                     # React frontend
│       ├── src/
│       │   ├── components/      # Reusable React components
│       │   │   ├── auth/       # Login forms and auth UI
│       │   │   └── instances/  # EC2 instance display components
│       │   ├── pages/          # Route-level components
│       │   ├── services/       # API clients and business logic
│       │   │   ├── auth.ts    # CRITICAL: Token stored in sessionStorage
│       │   │   └── ec2.ts     # EC2 API client
│       │   └── config/         # Environment configuration
│       └── tests/              # Component and E2E tests
├── packages/
│   ├── shared/                 # Shared types between frontend/backend
│   └── config/                 # Shared ESLint, TypeScript configs
├── infrastructure/             # CDK deployment code
│   ├── lib/stacks/
│   │   ├── api-stack.ts       # API Gateway + Lambda setup
│   │   ├── auth-stack.ts      # Cognito configuration
│   │   └── web-stack.ts       # S3 + CloudFront
│   └── bin/app.ts             # CDK app entry point
├── scripts/                    # Deployment automation
│   ├── deploy-web.py          # Frontend deployment script
│   └── cleanup-wrong-account.sh # Account cleanup utility
└── docs/                      # Comprehensive documentation
    ├── prd.md                # Product requirements
    ├── architecture/         # Sharded architecture docs
    └── stories/              # User story tracking
```

### Key Modules and Their Purpose

- **Authentication Service**: `apps/web/src/services/auth.ts` - Handles Cognito login/logout, token management
- **EC2 Service**: `apps/web/src/services/ec2.ts` - API client for EC2 operations
- **Lambda Authorizer**: `apps/api/src/functions/auth/authorizer.ts` - Validates JWT tokens from Cognito
- **Instance List Function**: `apps/api/src/functions/instances/list.ts` - Fetches EC2 instances from AWS
- **Dashboard Component**: `apps/web/src/pages/Dashboard.tsx` - Main UI for instance management
- **Instance Table**: `apps/web/src/components/instances/InstanceTable.tsx` - Material-UI DataGrid implementation

## Data Models and APIs

### Data Models

Current models are TypeScript interfaces, no database yet:

- **User Model**: See `packages/shared/src/types/auth.ts`
  ```typescript
  interface User {
    email: string;
    role: 'admin' | 'readonly';
    sub: string;  // Cognito user ID
  }
  ```

- **Instance Model**: See `packages/shared/src/types/ec2.ts`
  ```typescript
  interface Instance {
    instanceId: string;
    instanceType: string;
    state: string;
    publicIp?: string;
    privateIp?: string;
    launchTime: string;
    availabilityZone: string;
    tags?: Record<string, string>;
  }
  ```

### API Specifications

REST API endpoints (from API Gateway):

- **GET /health** - Health check endpoint
- **GET /instances** - List EC2 instances (requires auth)
- **POST /instances/{id}/reboot** - (PLANNED) Reboot instance
- **POST /instances/{id}/stop** - (PLANNED) Stop instance
- **POST /instances/{id}/start** - (PLANNED) Start instance

All endpoints except /health require Authorization header with Cognito ID token.

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Token Type Confusion**: Previously used access tokens instead of ID tokens - FIXED but watch for regression
2. **No Token Refresh**: Tokens expire after 1 hour, no automatic refresh mechanism
3. **Session Storage**: Using sessionStorage for tokens - vulnerable to XSS, consider httpOnly cookies
4. **No Caching**: EC2 data fetched on every request, no caching layer
5. **Error Recovery**: Minimal retry logic in Lambda functions
6. **No Database**: Audit logs and user preferences have no persistence

### Workarounds and Gotchas

- **Environment Variables**: Frontend uses import.meta.env, must prefix with VITE_
- **CORS Configuration**: API Gateway CORS must exactly match CloudFront distribution URL
- **Token Validation**: MUST use ID tokens for custom claims (role attribute)
- **Region Hardcoded**: Currently hardcoded to us-west-2, should be configurable
- **Python Scripts**: Deployment requires Python 3.9+ with boto3 installed
- **CDK Bootstrap**: Must bootstrap CDK in target account/region before first deploy

## Integration Points and External Dependencies

### External AWS Services

| Service      | Purpose                    | Integration Type | Key Files                                |
| ------------ | -------------------------- | ---------------- | ---------------------------------------- |
| Cognito      | User authentication        | SDK v3           | `apps/web/src/services/auth.ts`         |
| EC2          | Instance management        | SDK v3           | `apps/api/src/functions/instances/list.ts` |
| API Gateway  | REST API                   | CDK              | `infrastructure/lib/stacks/api-stack.ts` |
| Lambda       | Serverless compute         | CDK              | All files in `apps/api/src/functions/`  |
| CloudFront   | CDN for frontend           | CDK              | `infrastructure/lib/stacks/web-stack.ts` |
| S3           | Static website hosting     | CDK              | `infrastructure/lib/stacks/web-stack.ts` |
| CloudWatch   | Logging and monitoring     | SDK v3           | All Lambda functions                     |

### Internal Integration Points

- **Frontend-API Communication**: REST over HTTPS, expects specific CORS headers
- **Authentication Flow**: ID tokens passed in Authorization header
- **Error Handling**: Consistent error format with statusCode and message
- **Environment Config**: Separate configs for dev/staging/prod environments

## Development and Deployment

### Local Development Setup

1. **Prerequisites**:
   ```bash
   node --version  # Must be 20.x
   npm --version   # Must be 10.x
   python3 --version  # Must be 3.9+
   aws --version   # AWS CLI configured
   ```

2. **Install Dependencies**:
   ```bash
   npm install  # Installs all workspace dependencies
   ```

3. **Environment Setup**:
   ```bash
   cp apps/web/.env.example apps/web/.env
   # Edit .env with your Cognito and API Gateway URLs
   ```

4. **Run Development**:
   ```bash
   npm run dev -w web  # Start frontend dev server
   ```

**Known Issues**:
- Must have AWS credentials configured for CDK commands
- Python scripts require manual boto3 installation
- Vite dev server sometimes needs restart after env changes

### Build and Deployment Process

- **Build Commands**:
  ```bash
  npm run build -w web  # Build frontend
  npm run build -w api  # Build Lambda functions
  npm run synth -w infrastructure  # Synthesize CDK
  ```

- **Deployment**:
  ```bash
  python3 scripts/deploy-web.py  # Deploy frontend to S3/CloudFront
  npm run deploy -w infrastructure  # Deploy CDK stacks
  ```

- **Environments**:
  - Dev: Deployed and operational
  - Staging: Not configured
  - Prod: Not configured

## Testing Reality

### Current Test Coverage

- **Unit Tests**: ~75% coverage (Jest)
  - Good coverage for auth service
  - Lambda functions well tested
  - React components have basic tests

- **Integration Tests**: Minimal
  - API Gateway integration tests exist
  - No database integration tests (no DB yet)

- **E2E Tests**: Basic coverage (Playwright)
  - Login flow tested
  - Dashboard navigation tested
  - Instance table interaction tested

### Running Tests

```bash
npm test  # Run all unit tests
npm run test:e2e -w web  # Run Playwright E2E tests
npm run test:coverage  # Generate coverage report
```

**Test Issues**:
- E2E tests require deployed environment
- Some tests use hardcoded test data
- No performance testing implemented

## Enhancement Impact Analysis (Based on PRD)

### Files That Need Modification for Next Features

For **Epic 3: Instance Management & Admin Actions**:

1. **New Lambda Functions Required**:
   - `apps/api/src/functions/instances/reboot.ts` - Reboot functionality
   - `apps/api/src/functions/instances/stop.ts` - Stop instances
   - `apps/api/src/functions/instances/start.ts` - Start instances
   - `apps/api/src/functions/audit/log.ts` - Audit logging

2. **Frontend Components to Modify**:
   - `apps/web/src/components/instances/InstanceTable.tsx` - Add action buttons
   - `apps/web/src/pages/Dashboard.tsx` - Handle instance actions

3. **New Frontend Components Needed**:
   - `apps/web/src/components/instances/ActionConfirmDialog.tsx` - Confirmation UI
   - `apps/web/src/components/instances/InstanceActions.tsx` - Action buttons

4. **Infrastructure Changes**:
   - `infrastructure/lib/stacks/api-stack.ts` - Add new Lambda endpoints
   - `infrastructure/lib/stacks/data-stack.ts` - NEW: DynamoDB for audit logs

### Integration Considerations

- Must maintain consistent Authorization header pattern
- Action buttons only visible for admin role
- All actions need confirmation dialogs
- Audit logs must capture user email from token
- Consider implementing optimistic UI updates

### New Dependencies Likely Needed

- `@aws-sdk/client-dynamodb` - For audit logging
- `@aws-sdk/client-cloudwatch` - For metrics
- `recharts` or `@mui/x-charts` - For metrics visualization
- Additional Material-UI components for dialogs

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
# Development
npm run dev -w web        # Start frontend dev server
npm run test              # Run all tests
npm run lint              # Run ESLint
npm run type-check        # Run TypeScript checks

# Build & Deploy
npm run build -w web      # Build frontend
npm run build -w api      # Build Lambda functions
npm run synth -w infrastructure  # Synthesize CDK
python3 scripts/deploy-web.py    # Deploy frontend

# AWS Operations
aws s3 sync apps/web/dist s3://[bucket-name]  # Manual S3 sync
aws cloudfront create-invalidation --distribution-id [ID] --paths "/*"  # Clear CDN cache
aws logs tail /aws/lambda/EC2Manager-API-dev  # Watch Lambda logs
```

### Debugging and Troubleshooting

- **Logs**: CloudWatch log groups at `/aws/lambda/EC2Manager-*`
- **Debug Mode**: Set `DEBUG=true` in Lambda environment variables
- **Common Issues**:
  - Token errors: Check ID token vs access token
  - CORS errors: Verify API Gateway CORS configuration
  - 403 errors: Check IAM roles and Cognito attributes
  - Build failures: Clear node_modules and reinstall

### Environment URLs

- **Frontend**: https://d2pbh2fudgytg0.cloudfront.net
- **API**: https://xg34xg3ngh.execute-api.us-west-2.amazonaws.com/dev
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/home?region=us-west-2

### Test Credentials

| Email                    | Password       | Role     |
|-------------------------|----------------|----------|
| admin@ec2manager.com    | AdminPass123!  | admin    |
| readonly@ec2manager.com | ReadPass123!   | readonly |
| manager@ec2manager.com  | ManagerPass123! | admin    |
| viewer@ec2manager.com   | ViewerPass123! | readonly |

## Architecture Decisions Record (ADR)

### ADR-001: Use ID Tokens Instead of Access Tokens
- **Context**: Lambda authorizer needs user claims (email, role)
- **Decision**: Use ID tokens which contain custom attributes
- **Consequences**: Simpler authorization but tokens contain more data

### ADR-002: SessionStorage for Token Storage
- **Context**: Need to store JWT tokens client-side
- **Decision**: Use sessionStorage instead of localStorage
- **Consequences**: More secure (clears on tab close) but no persistence

### ADR-003: Monorepo Structure
- **Context**: Multiple related applications and shared code
- **Decision**: Use npm workspaces monorepo
- **Consequences**: Simpler dependency management but larger repo

### ADR-004: Material-UI Component Library
- **Context**: Need consistent, accessible UI components
- **Decision**: Use MUI v5 with DataGrid
- **Consequences**: Professional look but larger bundle size

## Conclusion

This brownfield architecture document captures the current reality of the EC2 Instance Manager application. The foundation is solid with working authentication, API infrastructure, and basic EC2 viewing capabilities. The codebase follows modern practices but has identified areas for improvement, particularly around token management, caching, and audit logging.

The next phase of development (Epic 3 & 4 from PRD) can build on this foundation to add instance management actions, CloudWatch metrics, and comprehensive audit logging. The modular structure and clear separation of concerns make these enhancements straightforward to implement.