# Source Tree Documentation

## Project Overview

**EC2 Instance Manager** is a full-stack application built as a modern cloud-native solution for managing AWS EC2 instances. The project follows a monorepo architecture using npm workspaces with clear separation of concerns across frontend, backend, infrastructure, and shared components.

## Root Directory Structure

```
genai-full-stack-basic/
├── .bmad-core/                 # BMad automation framework
├── .claude/                    # Claude AI configuration
├── .github/                    # GitHub workflows and configurations
├── .husky/                     # Git hooks for pre-commit validation
├── apps/                       # Application workspaces
│   ├── web/                   # React frontend application
│   └── api/                   # Lambda function backend
├── packages/                   # Shared packages and configurations
│   ├── config/                # Shared configuration (ESLint, Prettier, etc.)
│   └── shared/                # Shared types and utilities
├── infrastructure/             # AWS CDK infrastructure as code
├── docs/                      # Project documentation
├── scripts/                   # Deployment and utility scripts
├── venv/                      # Python virtual environment
└── web-bundles/               # Frontend deployment bundles
```

## Detailed Workspace Breakdown

### Apps Workspace (`/apps`)

#### Web Application (`/apps/web`)

- **Technology**: React 18 + TypeScript + Vite
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: React hooks and context
- **Testing**: Jest + React Testing Library + Playwright E2E
- **Authentication**: AWS Cognito integration

**Directory Structure**:

```
apps/web/
├── src/
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── common/           # Reusable UI components
│   │   └── instances/        # EC2 instance management components
│   ├── config/               # Application configuration
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Page-level components/routes
│   ├── services/             # API service layer
│   ├── store/                # State management
│   ├── styles/               # Theme and styling
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── tests/
│   ├── e2e/                  # Playwright end-to-end tests
│   │   ├── accessibility/    # Accessibility testing
│   │   ├── core-flows/       # Primary user journey tests
│   │   ├── performance/      # Performance testing
│   │   └── security/         # Security testing
│   └── unit/                 # Jest unit tests
└── public/                   # Static assets
```

**Key Files**:

- `src/App.tsx`: Main application component with routing
- `src/main.tsx`: Application entry point
- `vite.config.ts`: Vite build configuration
- `playwright.config.ts`: E2E testing configuration

#### API Application (`/apps/api`)

- **Technology**: Node.js + TypeScript + AWS Lambda
- **AWS Services**: EC2 Client, Lambda Runtime
- **Architecture**: Serverless functions with event-driven handlers

**Directory Structure**:

```
apps/api/
├── src/
│   └── functions/            # Lambda function handlers
│       ├── auth/            # Authentication functions
│       ├── health/          # Health check functions
│       └── instances/       # EC2 instance management functions
└── tests/
    └── unit/                # Jest unit tests
```

### Packages Workspace (`/packages`)

#### Shared Package (`/packages/shared`)

- **Purpose**: Common types, utilities, and constants shared across workspaces
- **Technology**: TypeScript with compiled distribution

**Directory Structure**:

```
packages/shared/
├── src/
│   ├── types/               # Shared TypeScript interfaces/types
│   └── utils/               # Shared utility functions
└── tests/
```

#### Configuration Package (`/packages/config`)

- **Purpose**: Centralized tooling configuration (ESLint, Prettier, Jest)
- **Includes**: Workspace-wide development standards and rules

**Directory Structure**:

```
packages/config/
├── eslint/                  # ESLint configurations
├── jest/                    # Jest testing configurations
├── prettier/                # Prettier formatting configurations
└── src/                     # Configuration utilities
```

### Infrastructure Workspace (`/infrastructure`)

- **Technology**: AWS CDK v2 + TypeScript
- **Purpose**: Infrastructure as Code for AWS resources
- **Architecture**: Multi-environment support (dev/prod)

**Directory Structure**:

```
infrastructure/
├── bin/                     # CDK application entry points
├── lib/                     # CDK constructs and stacks
│   ├── constructs/         # Reusable CDK constructs
│   └── stacks/             # CDK stack definitions
├── config/                  # Environment-specific configurations
└── tests/
    ├── integration/         # Infrastructure integration tests
    └── unit/               # CDK unit tests
```

### Documentation (`/docs`)

**Directory Structure**:

```
docs/
├── architecture/            # Technical architecture documentation
│   ├── api-specification.md
│   ├── backend-architecture.md
│   ├── coding-standards.md
│   ├── frontend-architecture.md
│   ├── source-tree.md      # This document
│   └── tech-stack.md
├── prd/                     # Product Requirements Documents
├── qa/                      # Quality Assurance documentation
├── stories/                 # User stories and feature specifications
└── troubleshooting/         # Troubleshooting guides
```

## Key Configuration Files

### Root Level

- `package.json`: Workspace configuration and root-level scripts
- `tsconfig.json`: Base TypeScript configuration
- `.prettierrc.json`: Code formatting rules
- `.gitignore`: Git exclusion patterns
- `CLAUDE.md`: Claude AI assistant instructions

### Development Tools

- `.husky/`: Git hooks for code quality enforcement
- `.github/workflows/`: CI/CD pipeline definitions
- `scripts/`: Deployment and utility automation scripts

### Environment Configuration

- `.env.example`, `.env.dev`, `.env.prod`: Environment variable templates

## Build and Development Workflow

### Workspace Commands

All workspaces can be managed from the root level:

- `npm run dev`: Start development servers
- `npm run build`: Build all workspaces
- `npm run test`: Run all tests
- `npm run lint`: Lint all workspaces
- `npm run type-check`: TypeScript validation

### Deployment

- **Frontend**: Python-based deployment script (`scripts/deploy-web.py`)
- **Infrastructure**: CDK-based deployment via npm scripts
- **Environment Support**: Separate dev/prod deployment pipelines

## Technology Stack Summary

| Component        | Technology                   | Purpose             |
| ---------------- | ---------------------------- | ------------------- |
| Frontend         | React 18 + TypeScript + Vite | User interface      |
| Backend          | Node.js + AWS Lambda         | API services        |
| Infrastructure   | AWS CDK v2                   | Cloud resources     |
| Database         | AWS DynamoDB                 | Data persistence    |
| Authentication   | AWS Cognito                  | User management     |
| State Management | React Context/Hooks          | Frontend state      |
| Testing          | Jest + Playwright            | Unit & E2E testing  |
| Build System     | npm workspaces               | Monorepo management |
| CI/CD            | GitHub Actions               | Automation          |

## Architecture Principles

1. **Monorepo Structure**: Single repository with multiple workspaces for better code sharing and consistency
2. **Serverless-First**: AWS Lambda and managed services for scalability and cost optimization
3. **TypeScript Throughout**: Type safety across all codebases
4. **Infrastructure as Code**: Declarative AWS resource management
5. **Test-Driven Development**: Comprehensive testing at unit, integration, and E2E levels
6. **Modern Frontend**: Component-based React architecture with hooks
7. **Shared Configurations**: Centralized tooling and standards across workspaces

## Development Environment Setup

1. **Prerequisites**: Node.js 20+, Python 3.x, AWS CLI
2. **Installation**: `npm install` (installs all workspace dependencies)
3. **AWS Configuration**: Configure AWS profile `jnicamzn-sso-ec2`
4. **Python Environment**: Activate virtual environment for deployment scripts
5. **Development**: Use workspace-specific commands or root-level commands

This source tree documentation provides a comprehensive overview of the EC2 Instance Manager project structure, enabling developers to quickly understand the codebase organization and development workflows.
