# Technical Architecture Document

## AWS EC2 Instance Management Platform

**Version:** 1.0
**Date:** January 2025
**Status:** Draft

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The platform follows a serverless, event-driven architecture pattern leveraging AWS managed services:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Users     │────▶│  CloudFront  │────▶│  S3 Static  │
└─────────────┘     └──────────────┘     │   Website   │
       │                                  └─────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cognito   │────▶│ API Gateway  │────▶│   Lambda    │
└─────────────┘     └──────────────┘     │  Functions  │
                                          └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  AWS APIs   │
                                          │    (EC2)    │
                                          └─────────────┘
```

### 1.2 Key Components

- **Frontend**: React SPA with Material-UI components
- **Hosting**: S3 + CloudFront CDN
- **Authentication**: AWS Cognito User Pool
- **API Layer**: API Gateway REST API
- **Compute**: Lambda functions (Node.js/TypeScript)
- **Monitoring**: CloudWatch Logs, Metrics, and Dashboards
- **IaC**: AWS CDK v2 with TypeScript

---

## 2. Frontend Architecture

### 2.1 Technology Stack

- **Framework**: React 18.x with TypeScript
- **UI Library**: Material-UI v5
- **State Management**: Context API with useReducer (or Redux Toolkit if complexity grows)
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite or Create React App

### 2.2 Component Structure

```
web/src/
├── components/
│   ├── common/          # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── LoadingSpinner.tsx
│   ├── auth/            # Authentication components
│   │   ├── LoginForm.tsx
│   │   └── ProtectedRoute.tsx
│   └── instances/       # EC2 instance components
│       ├── InstanceList.tsx
│       ├── InstanceCard.tsx
│       └── InstanceActions.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── NotFound.tsx
├── services/
│   ├── api.ts           # API service layer
│   ├── auth.ts          # Authentication service
│   └── ec2.ts           # EC2-specific API calls
├── hooks/
│   ├── useAuth.ts
│   └── useInstances.ts
├── context/
│   └── AuthContext.tsx
└── utils/
    ├── constants.ts
    └── helpers.ts
```

### 2.3 State Management Pattern

```typescript
// AuthContext example
interface AuthState {
  user: User | null;
  role: 'admin' | 'readonly' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Instance state
interface InstanceState {
  instances: EC2Instance[];
  selectedRegion: string;
  loading: boolean;
  error: string | null;
}
```

---

## 3. Backend Architecture

### 3.1 Lambda Function Structure

```
backend/lambdas/
├── auth/
│   ├── authorizer.ts      # Custom authorizer
│   └── postAuthentication.ts
├── ec2/
│   ├── listInstances.ts   # GET /instances
│   ├── getInstance.ts     # GET /instances/{id}
│   └── rebootInstance.ts  # POST /instances/{id}/reboot
└── shared/
    ├── types.ts
    ├── awsClients.ts
    └── errorHandler.ts
```

### 3.2 Lambda Configuration

```typescript
// Lambda function template
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse input
    const { region } = event.queryStringParameters || {};

    // Validate permissions
    const userRole = event.requestContext.authorizer?.role;

    // Execute business logic
    const instances = await ec2Service.listInstances(region);

    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN,
      },
      body: JSON.stringify(instances),
    };
  } catch (error) {
    return errorHandler(error);
  }
};
```

### 3.3 Shared Libraries

- AWS SDK v3 clients for EC2, CloudWatch
- Input validation using Joi or Zod
- Error handling middleware
- Logging utilities with correlation IDs

---

## 4. Authentication & Authorization

### 4.1 Cognito Configuration

```typescript
// CDK Stack Configuration
const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: `${props.env}-ec2-manager-pool`,
  selfSignUpEnabled: false,
  signInAliases: { email: true },
  autoVerify: { email: true },
  passwordPolicy: {
    minLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true,
  },
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  customAttributes: {
    role: new cognito.StringAttribute({ mutable: false }),
  },
});
```

### 4.2 User Roles & Permissions

| Role     | List Instances | View Details | Reboot | Start/Stop |
| -------- | -------------- | ------------ | ------ | ---------- |
| admin    | ✓              | ✓            | ✓      | Future     |
| readonly | ✓              | ✓            | ✗      | ✗          |

### 4.3 JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "custom:role": "admin",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## 5. Infrastructure Components

### 5.1 S3 Bucket Configuration

```typescript
const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
  bucketName: `${props.env}-ec2-manager-web`,
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'error.html',
  publicReadAccess: false,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
  lifecycleRules: [
    {
      noncurrentVersionExpiration: cdk.Duration.days(30),
    },
  ],
});
```

### 5.2 CloudFront Distribution

```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    compress: true,
  },
  defaultRootObject: 'index.html',
  errorResponses: [
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: cdk.Duration.seconds(0),
    },
  ],
  minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
});
```

### 5.3 API Gateway Configuration

```typescript
const api = new apigateway.RestApi(this, 'Api', {
  restApiName: `${props.env}-ec2-manager-api`,
  deployOptions: {
    stageName: props.env,
    throttlingRateLimit: 100,
    throttlingBurstLimit: 200,
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
    dataTraceEnabled: true,
    metricsEnabled: true,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [distribution.distributionDomainName],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});
```

---

## 6. Data Flow & API Design

### 6.1 API Endpoints

| Method | Endpoint               | Description          | Auth Required | Admin Only |
| ------ | ---------------------- | -------------------- | ------------- | ---------- |
| POST   | /auth/login            | User login           | No            | No         |
| POST   | /auth/refresh          | Refresh token        | Yes           | No         |
| GET    | /instances             | List EC2 instances   | Yes           | No         |
| GET    | /instances/{id}        | Get instance details | Yes           | No         |
| POST   | /instances/{id}/reboot | Reboot instance      | Yes           | Yes        |

### 6.2 Request/Response Flow

```
1. User Login Flow:
   Browser → CloudFront → S3 (React App)
   React → API Gateway → Cognito
   Cognito → React (JWT Token)

2. List Instances Flow:
   React (with JWT) → API Gateway
   API Gateway → Lambda Authorizer
   Lambda → EC2 API
   EC2 API → Lambda → API Gateway → React

3. Reboot Instance Flow:
   React → API Gateway (with JWT)
   API Gateway → Lambda Authorizer (check admin role)
   Lambda → EC2 Reboot API
   Lambda → CloudWatch Event
   Response → React (with confirmation)
```

### 6.3 Data Models

```typescript
interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: 'running' | 'stopped' | 'stopping' | 'starting' | 'terminated';
  publicIp?: string;
  privateIp: string;
  launchTime: string;
  tags: Record<string, string>;
  availabilityZone: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
```

---

## 7. Security Architecture

### 7.1 IAM Roles and Policies

```typescript
// Lambda execution role
const lambdaRole = new iam.Role(this, 'LambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
  inlinePolicies: {
    EC2Access: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ['ec2:DescribeInstances', 'ec2:DescribeInstanceStatus'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: ['ec2:RebootInstances'],
          resources: [`arn:aws:ec2:${region}:${account}:instance/*`],
          conditions: {
            StringEquals: {
              'aws:RequestedRegion': region,
            },
          },
        }),
      ],
    }),
  },
});
```

### 7.2 Security Best Practices

- **Encryption at Rest**: S3 SSE, Lambda environment variables encrypted
- **Encryption in Transit**: TLS 1.2+ for all communications
- **API Security**: Rate limiting, request throttling, API keys
- **CORS**: Strict origin policies, credentials not included
- **Input Validation**: All inputs sanitized and validated
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **Audit Logging**: CloudTrail for all API calls

### 7.3 Network Security

```typescript
// VPC Configuration (if needed for future RDS/ElastiCache)
const vpc = new ec2.Vpc(this, 'VPC', {
  maxAzs: 2,
  natGateways: 0, // Serverless, no NAT needed initially
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
    },
  ],
});
```

---

## 8. Deployment Architecture

### 8.1 CDK Stack Structure

```
infrastructure/
├── stacks/
│   ├── AuthStack.ts        # Cognito resources
│   ├── WebStack.ts         # S3, CloudFront
│   ├── ApiStack.ts         # API Gateway, Lambda
│   └── MonitoringStack.ts  # CloudWatch dashboards
├── constructs/
│   ├── LambdaFunction.ts   # Reusable Lambda construct
│   └── ApiEndpoint.ts      # API endpoint construct
└── config/
    ├── dev.json
    └── prod.json
```

### 8.2 Environment Configuration

```json
// config/dev.json
{
  "environment": "dev",
  "region": "us-east-1",
  "account": "123456789012",
  "apiThrottleRate": 100,
  "apiThrottleBurst": 200,
  "logRetention": 7,
  "enableXRay": false
}

// config/prod.json
{
  "environment": "prod",
  "region": "us-east-1",
  "account": "987654321098",
  "apiThrottleRate": 1000,
  "apiThrottleBurst": 2000,
  "logRetention": 30,
  "enableXRay": true
}
```

### 8.3 Deployment Scripts

```python
# scripts/deploy/full-deploy.py
#!/usr/bin/env python3
import subprocess
import argparse
import os
from dotenv import load_dotenv

def deploy(env: str):
    load_dotenv(f'.env.{env}')

    # Deploy CDK stacks
    subprocess.run([
        'cdk', 'deploy', '--all',
        '--require-approval', 'never',
        '--context', f'env={env}',
        '--profile', os.getenv('AWS_PROFILE'),
        '--region', os.getenv('AWS_REGION')
    ])

    # Deploy website
    subprocess.run(['python', 'scripts/deploy/web-deploy.py', '--env', env])
```

---

## 9. Monitoring & Observability

### 9.1 CloudWatch Metrics

```typescript
// Custom metrics
const instanceListMetric = new cloudwatch.Metric({
  namespace: 'EC2Manager',
  metricName: 'InstanceListRequests',
  dimensions: { Environment: props.env },
});

// Alarms
new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: apiGateway.metricServerError(),
  threshold: 10,
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
```

### 9.2 Logging Strategy

- **Application Logs**: Structured JSON logging
- **Access Logs**: API Gateway access logs to CloudWatch
- **Error Logs**: Centralized error tracking
- **Audit Logs**: User actions and administrative changes

### 9.3 Dashboard Configuration

```typescript
const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
  dashboardName: `${props.env}-ec2-manager`,
  widgets: [
    [apiRequestsWidget, apiLatencyWidget],
    [lambdaErrorsWidget, lambdaDurationWidget],
    [cognitoLoginsWidget, activeUsersWidget],
  ],
});
```

---

## 10. Development Standards

### 10.1 Coding Conventions

```typescript
// TypeScript/JavaScript Standards
- ESLint configuration: airbnb-typescript
- Prettier for formatting
- Strict TypeScript mode enabled
- No any types without explicit justification
- Async/await over promises
- Functional components with hooks

// Python Standards
- Black for formatting
- Type hints required
- Docstrings for all functions
- Virtual environment required
```

### 10.2 Git Workflow

```
main
  └── develop
       ├── feature/add-instance-filtering
       ├── feature/implement-bulk-actions
       └── bugfix/fix-auth-refresh
```

### 10.3 Testing Strategy

```typescript
// Unit Tests (Jest)
describe('EC2Service', () => {
  it('should list instances for valid region', async () => {
    const instances = await ec2Service.listInstances('us-east-1');
    expect(instances).toHaveLength(3);
  });
});

// Integration Tests
describe('API Integration', () => {
  it('should require authentication for /instances', async () => {
    const response = await request(API_URL).get('/instances');
    expect(response.status).toBe(401);
  });
});

// E2E Tests (Playwright)
test('Admin can reboot instance', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'testuser-admin@example.com');
  await page.fill('#password', 'TestUserAdmin!ABC123!');
  await page.click('#login-button');
  await page.waitForSelector('.instance-card');
  await page.click('.reboot-button');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## 11. API Specification

### 11.1 OpenAPI/Swagger Definition

```yaml
openapi: 3.0.0
info:
  title: EC2 Manager API
  version: 1.0.0
  description: API for managing EC2 instances

paths:
  /instances:
    get:
      summary: List EC2 instances
      security:
        - BearerAuth: []
      parameters:
        - name: region
          in: query
          schema:
            type: string
            default: us-east-1
      responses:
        200:
          description: List of instances
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Instance'

  /instances/{instanceId}/reboot:
    post:
      summary: Reboot an instance
      security:
        - BearerAuth: []
      parameters:
        - name: instanceId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Reboot initiated
        403:
          description: Insufficient permissions

components:
  schemas:
    Instance:
      type: object
      properties:
        instanceId:
          type: string
        state:
          type: string
          enum: [running, stopped, stopping, starting]
        instanceType:
          type: string
        launchTime:
          type: string
          format: date-time

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 12. Directory Structure & Module Organization

### 12.1 Complete Repository Structure

```
genai-full-stack-basic/
├── web/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                      # Lambda functions
│   ├── lambdas/
│   │   ├── auth/
│   │   ├── ec2/
│   │   └── shared/
│   ├── layers/
│   │   └── nodejs/
│   ├── package.json
│   └── tsconfig.json
│
├── infrastructure/               # CDK application
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   ├── stacks/
│   │   └── constructs/
│   ├── config/
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/                      # Deployment scripts
│   ├── deploy/
│   │   ├── full-deploy.py
│   │   └── web-deploy.py
│   ├── utils/
│   └── requirements.txt
│
├── tests/                        # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
│       ├── playwright.config.ts
│       └── specs/
│
├── docs/                         # Documentation
│   ├── api/
│   │   └── openapi.yaml
│   ├── architecture/
│   ├── deployment/
│   └── project-brief.md
│
├── .github/                      # GitHub configuration
│   └── workflows/
│       ├── dev-deploy.yml
│       └── prod-deploy.yml
│
├── .env.dev                      # Development environment
├── .env.prod                     # Production environment
├── .gitignore
├── README.md
└── package.json                  # Root package.json for workspaces
```

### 12.2 Module Dependencies

```json
// Root package.json (npm workspaces)
{
  "name": "genai-full-stack-basic",
  "workspaces": ["web", "backend", "infrastructure"],
  "scripts": {
    "install:all": "npm install",
    "build:web": "npm run build --workspace=web",
    "build:backend": "npm run build --workspace=backend",
    "build:infra": "npm run build --workspace=infrastructure",
    "test:all": "npm test --workspaces",
    "deploy:dev": "python scripts/deploy/full-deploy.py --env dev",
    "deploy:prod": "python scripts/deploy/full-deploy.py --env prod"
  }
}
```

---

## 13. Performance Considerations

### 13.1 Frontend Optimization

- Code splitting with React.lazy()
- Image optimization with WebP format
- Bundle size monitoring
- CloudFront caching strategies
- Prefetching critical resources

### 13.2 Backend Optimization

- Lambda cold start optimization
- Connection pooling for AWS SDK
- Response caching in API Gateway
- Batch operations where possible
- Provisioned concurrency for critical functions

---

## 14. Future Enhancements

### Phase 2 Considerations

- WebSocket support for real-time updates
- Multi-region support
- Instance scheduling
- Cost analytics dashboard
- Terraform import capability
- Mobile application

### Phase 3 Considerations

- Multi-account support
- SSO integration
- Advanced monitoring with X-Ray
- Auto-scaling group management
- Backup and snapshot management

---

## Appendices

### A. Environment Variables

```bash
# .env.dev
AWS_PROFILE=dev-profile
AWS_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=123456789012
API_DOMAIN=api-dev.example.com
WEB_DOMAIN=app-dev.example.com

# .env.prod
AWS_PROFILE=prod-profile
AWS_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=987654321098
API_DOMAIN=api.example.com
WEB_DOMAIN=app.example.com
```

### B. Useful Commands

```bash
# Development
npm run dev              # Start local development
npm run test            # Run all tests
npm run lint            # Lint code

# Deployment
cdk synth               # Synthesize CloudFormation
cdk diff                # Show deployment changes
cdk deploy --all        # Deploy all stacks
python scripts/deploy/full-deploy.py --env dev

# Monitoring
aws logs tail /aws/lambda/ec2-manager --follow
aws cloudwatch get-metric-statistics --namespace EC2Manager
```

---

**Document Version Control:**

- v1.0 - Initial architecture document
- Last Updated: January 2025
- Next Review: After Phase 1 completion
