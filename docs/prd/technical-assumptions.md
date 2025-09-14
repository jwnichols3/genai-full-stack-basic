# Technical Assumptions

## Repository Structure: Monorepo

Single repository containing all components (web, backend, infrastructure) managed with npm workspaces for simplified dependency management and atomic commits across the full stack.

## Service Architecture

Serverless architecture using AWS Lambda functions within a monorepo structure. Event-driven design with API Gateway routing to individual Lambda functions for each endpoint. No persistent servers or containers, leveraging AWS managed services for all infrastructure needs. This approach minimizes operational overhead while providing automatic scaling and high availability.

## Testing Requirements

Full testing pyramid implementation:

- **Unit Tests**: Jest for both frontend (React components) and backend (Lambda functions) with minimum 80% coverage
- **Integration Tests**: React Testing Library for component integration, API endpoint testing with mocked AWS services
- **E2E Tests**: Playwright for critical user journeys including login, instance viewing, and admin actions
- **Manual Testing Convenience**: Deployed development environment for stakeholder validation
- **Performance Tests**: Load testing for API endpoints to validate NFR requirements

## Additional Technical Assumptions and Requests

- **Frontend Framework**: React 18.x with TypeScript strict mode, Material-UI v5 for components
- **Backend Runtime**: Node.js 18.x on AWS Lambda with TypeScript
- **Infrastructure as Code**: AWS CDK v2 with TypeScript for all infrastructure definitions
- **API Design**: RESTful API with OpenAPI 3.0 specification, JSON request/response format
- **Authentication**: AWS Cognito User Pools with JWT tokens, no social login providers
- **State Management**: React Context API with useReducer (upgrade to Redux Toolkit if complexity grows)
- **Build Tools**: Vite for frontend bundling, esbuild for Lambda function packaging
- **Deployment**: Python scripts orchestrating CDK deployments with environment-specific configurations
- **Monitoring**: CloudWatch Logs, Metrics, and Dashboards for all components
- **Security**: IAM roles with least privilege, API throttling, input validation on all endpoints
- **Version Control**: Git with feature branch workflow (main → develop → feature branches)
- **CI/CD**: GitHub Actions for automated testing and deployment pipelines
- **Development Tools**: ESLint with airbnb-typescript config, Prettier for formatting, Husky for pre-commit hooks
- **Package Management**: npm workspaces for monorepo dependency management
- **Environment Management**: .env files for local development, AWS Systems Manager Parameter Store for deployed environments
- **CORS Configuration**: Strict origin validation, credentials not included in requests
- **Error Handling**: Centralized error handling with correlation IDs for request tracing
- **Database**: No database initially (stateless), DynamoDB considered for future session/preference storage
- **Caching**: CloudFront for static assets, API Gateway caching for appropriate GET endpoints
