# Monitoring and Observability

## Monitoring Stack
- **Frontend Monitoring:** CloudWatch RUM (Real User Monitoring)
- **Backend Monitoring:** CloudWatch Logs, Metrics, and X-Ray
- **Error Tracking:** CloudWatch Logs Insights with alerts
- **Performance Monitoring:** CloudWatch Performance Insights

## Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors per session
- API response times (p50, p95, p99)
- User interactions (clicks, form submissions)
- Page load times by route

**Backend Metrics:**
- Request rate (requests per second)
- Error rate (4xx and 5xx responses)
- Response time (p50, p95, p99)
- Lambda cold starts
- Lambda concurrent executions
- DynamoDB read/write capacity consumed
- Database query performance
