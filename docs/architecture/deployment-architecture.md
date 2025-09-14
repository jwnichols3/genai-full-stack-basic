# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**

- **Platform:** S3 + CloudFront
- **Build Command:** `npm run build:web`
- **Output Directory:** `apps/web/dist`
- **CDN/Edge:** CloudFront with 24-hour cache for assets

**Backend Deployment:**

- **Platform:** AWS Lambda via API Gateway
- **Build Command:** `npm run build:api`
- **Deployment Method:** AWS CDK with blue-green deployment

## CI/CD Pipeline

```yaml

```
