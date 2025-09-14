A full-stack solution that has a UI to view a list of EC2 instances for a particular AWS account in a specified region throught he UI. A login / auth validates a pre-registered user. The user has one of two roles - admin or read-only.

With read-only, the user can see the status of the instance (information gathered from the AWS metadata). The user with admin rights can reboot the instance.

Pre-registered users (email / password):

- jnicamzn@amazon.com / no pre-assigned password
- testuser-admin@example.com / TestUserAdmin!ABC123!
- testuser-readonly@example.com / TestUserReadOnly!ABC123!
- jwnichols3@gmail.com / no pre-assigned password

Please use up-to-date native AWS tools with best practices the for the full-stack solution:

- React front-end website
- Website using S3 + CloudFront
- Authentication using Cognito.
- API calls using API Gateway backed by Lambda functions
- CloudWatch instrumentation and observability
- Infrastructure as Code using AWS CDK with TypeScript

Please have two environments - one dev and one prod. Use the AWS environment for these environments A local dev environment and mock interfaces are not necessary.

One guideline is to deploy the environment early and often.

The web-deploy-example.py script in ./scripts is the structure for deploying the website. It reads the CDK deployment asset information and uses that to inform the process of syncing website files and invalidating the CloudFront cache. I'd like to re-use the structure. I'd also like to create a script "full-deploy.py" that deploys the CDK assets and calls web-deploy.py script.

include the --env {environment} option.

I'd like a way to specify which AWS profile and Region to use when building and deploying the assets. The idea is to allow this to be deployed to any account/region based on a setting. It seems like this is best done using a dot-env file.

Please use best practices for the repo folder structure. At a minimum use /web for front-end, /backend for back-end, /scripts for utilities.

If running any Python scripts, please use a virtual environment.

Specific elements:

- State Management: Whichever React framework is well proven
- UI Framework: Material-UI
- API Documentation: OpenAPI/Swagger specification
- Unit Testing: Jest + React Testing Library
- E2E UI Testing: Playwright using the Chromium user agent
- Monitoring: Keep it simple to start
- IaC: CDK v2 with TypeScript + CDK Pipelines
