# Unified Project Structure

```plaintext
ec2-instance-manager/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml            # Run tests and linting
│       └── deploy.yaml        # Deploy to AWS
├── apps/                       # Application packages
│   ├── web/                    # Frontend application
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API client services
│   │   │   ├── store/          # State management
│   │   │   ├── styles/         # Global styles/themes
│   │   │   ├── utils/          # Frontend utilities
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── App.tsx         # App root component
│   │   │   └── main.tsx        # Entry point
│   │   ├── public/             # Static assets
│   │   │   └── favicon.ico
│   │   ├── tests/              # Frontend tests
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                    # Backend application
│       ├── src/
│       │   ├── functions/      # Lambda function handlers
│       │   ├── shared/         # Shared backend code
│       │   │   ├── services/   # Business logic services
│       │   │   ├── middleware/ # Lambda middleware
│       │   │   └── utils/      # Backend utilities
│       │   └── types/          # Backend types
│       ├── tests/              # Backend tests
│       ├── tsconfig.json
│       └── package.json
├── packages/                   # Shared packages
│   ├── shared/                 # Shared types/utilities
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript interfaces
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Shared utilities
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                 # Shared configuration
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── jest/
│           └── jest.config.js
├── infrastructure/             # IaC definitions
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── api-stack.ts   # API Gateway + Lambda
│   │   │   ├── auth-stack.ts  # Cognito setup
│   │   │   ├── web-stack.ts   # S3 + CloudFront
│   │   │   └── data-stack.ts  # DynamoDB tables
│   │   └── constructs/        # Reusable CDK constructs
│   ├── bin/
│   │   └── app.ts             # CDK app entry
│   ├── cdk.json
│   ├── tsconfig.json
│   └── package.json
├── scripts/                    # Build/deploy scripts
│   ├── deploy.sh
│   ├── test-all.sh
│   └── seed-users.ts          # Cognito user seeding
├── docs/                       # Documentation
│   ├── prd.md
│   ├── architecture.md        # This document
│   └── README.md
├── .env.example                # Environment template
├── package.json                # Root package.json
├── tsconfig.json              # Root TypeScript config
└── README.md
```
