# Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Type-safe frontend development | Type safety reduces runtime errors and improves IDE support |
| Frontend Framework | React | 18.2+ | UI component framework | Industry standard with vast ecosystem and AWS Amplify support |
| UI Component Library | Material-UI (MUI) | 5.15+ | Pre-built React components | Provides professional UI components aligned with Material Design |
| State Management | Context API + useReducer | Built-in | Application state management | Sufficient for app complexity without Redux overhead |
| Backend Language | TypeScript | 5.3+ | Type-safe backend development | Consistency with frontend and strong typing |
| Backend Framework | AWS Lambda + Node.js | 20.x | Serverless compute runtime | Native AWS integration with minimal cold start times |
| API Style | REST | N/A | API architecture pattern | Simple, well-understood pattern suitable for CRUD operations |
| Database | DynamoDB | N/A | NoSQL database for audit logs | Serverless, auto-scaling, perfect for append-only audit data |
| Cache | CloudFront | N/A | CDN and API caching | Built-in with AWS, reduces latency globally |
| File Storage | S3 | N/A | Static asset and website hosting | Industry standard for static site hosting |
| Authentication | AWS Cognito | N/A | User authentication and authorization | Managed service with built-in security features |
| Frontend Testing | Jest + React Testing Library | 29.x / 14.x | Unit and integration testing | Standard React testing stack |
| Backend Testing | Jest | 29.x | Lambda function testing | Consistent with frontend tooling |
| E2E Testing | Playwright | 1.40+ | End-to-end browser testing | Modern, fast, reliable cross-browser testing |
| Build Tool | Vite | 5.0+ | Frontend build and dev server | Fast builds with hot module replacement |
| Bundler | Vite (Rollup) | 5.0+ | JavaScript bundling | Integrated with Vite, optimized production builds |
| IaC Tool | AWS CDK | 2.100+ | Infrastructure as Code | Type-safe infrastructure with TypeScript |
| CI/CD | GitHub Actions | N/A | Continuous Integration/Deployment | Free for public repos, good AWS integration |
| Monitoring | CloudWatch | N/A | Logs, metrics, and dashboards | Native AWS service with Lambda integration |
| Logging | CloudWatch Logs | N/A | Centralized logging | Automatic Lambda log aggregation |
| CSS Framework | Emotion (via MUI) | 11.x | CSS-in-JS styling | Integrated with Material-UI, dynamic styling |
