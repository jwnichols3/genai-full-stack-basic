import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = (event: APIGatewayProxyEvent, context: Context): APIGatewayProxyResult => {
  // eslint-disable-next-line no-console
  console.log('Health check request:', {
    requestId: context.awsRequestId,
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
  });

  const response: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': context.awsRequestId,
      'Access-Control-Allow-Origin': event.headers.origin ?? '*',
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Expose-Headers': 'X-Request-Id',
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
      environment: process.env.NODE_ENV ?? 'unknown',
      message: 'EC2 Manager API is running successfully',
    }),
  };

  // eslint-disable-next-line no-console
  console.log('Health check response:', {
    requestId: context.awsRequestId,
    statusCode: response.statusCode,
  });

  return response;
};
