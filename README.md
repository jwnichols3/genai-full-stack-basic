# EC2 Instance Manager

A full-stack AWS application for managing EC2 instances with comprehensive audit logging, built with React, TypeScript, AWS Lambda, and CDK.

## Project Overview

EC2 Instance Manager provides a secure, user-friendly interface for managing AWS EC2 instances with complete audit trail functionality. The application uses AWS Cognito for authentication, DynamoDB for audit logging, and CloudFront for global content delivery.

## 🚀 Live Demo

**Frontend Application**: https://d2pbh2fudgytg0.cloudfront.net

### Test Credentials

| Email                     | Password          | Role     | Access Level                |
| ------------------------- | ----------------- | -------- | --------------------------- |
| `admin@ec2manager.com`    | `AdminPass123!`   | admin    | Full access to all features |
| `readonly@ec2manager.com` | `ReadPass123!`    | readonly | Read-only access            |
| `manager@ec2manager.com`  | `ManagerPass123!` | admin    | Full access to all features |
| `viewer@ec2manager.com`   | `ViewerPass123!`  | readonly | Read-only access            |

## Tech Stack

- **Frontend**: React 18.2+, TypeScript 5.3+, Material-UI 5.15+, Vite 5.0+
- **Backend**: AWS Lambda (Node.js 20.x), TypeScript 5.3+, DynamoDB
- **Infrastructure**: AWS CDK 2.100+, CloudFormation
- **Authentication**: AWS Cognito (ID token-based authorization)
- **Testing**: Jest 29.x, React Testing Library, Playwright

## Project Structure

```
ec2-instance-manager/
├── apps/
│   ├── web/           # React frontend application
│   └── api/           # Lambda functions for backend
├── packages/
│   ├── shared/        # Shared types and utilities
│   └── config/        # Shared configuration (ESLint, Prettier, etc.)
├── infrastructure/    # AWS CDK infrastructure code
├── scripts/          # Build and deployment scripts
└── docs/             # Project documentation
```

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd genai-full-stack-basic
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces using npm workspaces.

### 3. Configure Environment

Copy the example environment file and update with your AWS credentials:

```bash
cp .env.example .env.dev
# Edit .env.dev with your AWS profile and settings
```

### 4. Build the Project

```bash
npm run build
```

## Development

### Running the Frontend

```bash
npm run dev
```

This starts the Vite development server for the React application.

### Running the Backend Locally

```bash
npm run dev:api
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm run test:web
npm run test:api
npm run test:infra

# Run tests with coverage
npm run test -- --coverage
```

### End-to-End Testing

The project includes comprehensive E2E tests using Playwright:

```bash
# Run basic E2E tests (recommended for development) - ~30-60 seconds
npm run test:e2e:basic

# Run all E2E tests (comprehensive coverage) - ~5-10 minutes
npm run test:e2e

# Run E2E tests with visible browser (for debugging)
npm run test:e2e:headed

# Run E2E tests in interactive UI mode
npm run test:e2e:ui
```

**Quick Testing**: Use `npm run test:e2e:basic` when making changes to verify core functionality (login → dashboard → logout) still works.

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code with Prettier
npm run format

# Type checking
npm run type-check
```

## Documentation

- [Authentication Implementation](./docs/authentication-implementation.md) - Complete guide to the authentication flow
- [Troubleshooting Auth Issues](./docs/troubleshooting/auth-token-mismatch.md) - Common authentication problems and solutions

## Deployment

### Deploy to Development Environment

```bash
cd infrastructure
npm run build          # Always build before deploying
npm run deploy:dev
```

### Deploy to Production Environment

```bash
cd infrastructure
npm run build          # Always build before deploying
npm run deploy:prod
```

**Note:** Always run `npm run build` before deploying to ensure TypeScript is compiled.

### 5. Deploy Frontend Application

After infrastructure deployment, deploy the frontend:

```bash
# Install Python dependencies for deployment script
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Deploy frontend to dev environment
python scripts/deploy-web.py dev --profile jnicamzn-sso-ec2
```

### 6. Seed Test Users

Create test users for authentication:

```bash
AWS_PROFILE=jnicamzn-sso-ec2 NODE_ENV=dev npx tsx scripts/seed-users.ts
```

## 📋 Environment Configuration

### Required Environment Variables

The following environment variables are automatically configured during deployment:

```bash
# Cognito Configuration (from deployed infrastructure)
VITE_COGNITO_USER_POOL_ID=us-west-2_mDM8sap1x
VITE_COGNITO_CLIENT_ID=238u9sk9ds3k8be0qu2hahsvqi
VITE_COGNITO_DOMAIN=https://ec2-manager-dev-357044226454.auth.us-west-2.amazoncognito.com
VITE_AWS_REGION=us-west-2

# API Configuration (to be added in future epics)
VITE_API_URL=https://api-dev.ec2manager.local/api
```

### Deployment Outputs

After successful deployment, note these important values:

- **Frontend URL**: https://d2pbh2fudgytg0.cloudfront.net
- **S3 Bucket**: ec2-manager-web-dev-us-west-2
- **CloudFront Distribution**: E1MR5C1ECGXXFG
- **AWS Account**: 357044226454
- **Region**: us-west-2

## Available Scripts

### Root Level Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:api` - Start backend development server
- `npm run build` - Build all workspaces
- `npm run test` - Run all tests
- `npm run lint` - Lint all workspaces
- `npm run format` - Format all workspaces
- `npm run type-check` - Type check all workspaces

### Workspace-Specific Scripts

Each workspace (apps/web, apps/api, infrastructure) has its own set of scripts. Run them using:

```bash
npm run <script> --workspace=<workspace-name>
```

## Coding Standards

- **TypeScript**: Strict mode enabled across all workspaces
- **React Components**: PascalCase naming (e.g., `UserProfile.tsx`)
- **Functions**: camelCase naming (e.g., `getUserById()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **API Routes**: kebab-case (e.g., `/api/user-profile`)
- **Database Tables**: snake_case (e.g., `user_profiles`)

## Testing Strategy

- **Unit Tests**: Located in `tests/unit/` directories
- **Integration Tests**: Located in `tests/integration/` directories
- **Minimum Coverage**: 80% for critical business logic
- **Testing Framework**: Jest for unit/integration, Playwright for E2E

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Ensure all tests pass and coverage requirements are met
4. Run linting and formatting before committing
5. Create a pull request with a clear description

## Pre-commit Hooks

This project uses Husky for pre-commit hooks to ensure code quality:

- Linting check
- Formatting check
- Type checking

## Troubleshooting

For common deployment issues and their solutions, see:

- [CDK Deployment Issues](docs/troubleshooting/cdk-deployment-issues.md)

### Common Issues

- **S3 Lifecycle Errors**: Ensure expiration days > transition days
- **Build Process**: Always run `npm run build` before CDK deployment
- **AWS Profile**: Use explicit `--profile jnicamzn-sso-ec2` flag
- **Orphaned Resources**: Clean up failed deployment artifacts

## Environment Variables

See `.env.example` for all available environment variables. Key variables include:

- `AWS_PROFILE`: AWS profile for deployment (jnicamzn-sso-ec2)
- `AWS_REGION`: AWS region (us-west-2)
- `NODE_ENV`: Environment (development/production)
- `VITE_API_URL`: API endpoint for frontend

## Security

- Never commit sensitive credentials to the repository
- Use AWS Cognito for all authentication
- Follow AWS security best practices
- Environment variables are managed through AWS Systems Manager Parameter Store in production

## License

[License Type] - See LICENSE file for details

## Support

For issues or questions, please create an issue in the GitHub repository.
