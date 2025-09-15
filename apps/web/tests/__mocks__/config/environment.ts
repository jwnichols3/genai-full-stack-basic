// Mock environment configuration for tests
export const config = {
  apiBaseUrl: 'http://localhost:3001/api',
  cognito: {
    userPoolId: 'test-user-pool-id',
    clientId: 'test-client-id',
    domain: 'test-domain',
    region: 'us-west-2',
  },
  app: {
    name: 'EC2 Instance Manager',
    version: '1.0.0',
  },
  isDevelopment: true,
  isProduction: false,
};

export const validateEnvironmentConfig = () => [];

export default config;
