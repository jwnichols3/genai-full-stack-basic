// Environment configuration utility
// Access environment variables through this config object, not process.env directly

interface EnvironmentConfig {
  // API Configuration
  apiBaseUrl: string;

  // AWS Cognito Configuration
  cognito: {
    userPoolId: string;
    clientId: string;
    domain: string;
    region: string;
  };

  // Application Configuration
  app: {
    name: string;
    version: string;
  };

  // Development flags
  isDevelopment: boolean;
  isProduction: boolean;
}

const getEnvironmentVariable = (key: string, defaultValue: string = ''): string => {
  const value = import.meta.env[key] as string | undefined;
  if (value === undefined || value === null) {
    if (defaultValue === '') {
      console.warn(`Environment variable ${key} is not defined`);
    }
    return defaultValue;
  }
  return value;
};

export const config: EnvironmentConfig = {
  // API Configuration
  apiBaseUrl: getEnvironmentVariable('VITE_API_URL', 'http://localhost:3001/api'),

  // AWS Cognito Configuration
  cognito: {
    userPoolId: getEnvironmentVariable('VITE_COGNITO_USER_POOL_ID'),
    clientId: getEnvironmentVariable('VITE_COGNITO_CLIENT_ID'),
    domain: getEnvironmentVariable('VITE_COGNITO_DOMAIN'),
    region: getEnvironmentVariable('VITE_AWS_REGION', 'us-west-2'),
  },

  // Application Configuration
  app: {
    name: getEnvironmentVariable('VITE_APP_NAME', 'EC2 Instance Manager'),
    version: getEnvironmentVariable('VITE_APP_VERSION', '1.0.0'),
  },

  // Development flags
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Validation function to check if all required environment variables are set
export const validateEnvironmentConfig = (): string[] => {
  const errors: string[] = [];

  if (!config.cognito.userPoolId && config.isProduction) {
    errors.push('VITE_COGNITO_USER_POOL_ID is required in production');
  }

  if (!config.cognito.clientId && config.isProduction) {
    errors.push('VITE_COGNITO_CLIENT_ID is required in production');
  }

  if (!config.cognito.domain && config.isProduction) {
    errors.push('VITE_COGNITO_DOMAIN is required in production');
  }

  return errors;
};

// Log configuration in development
if (config.isDevelopment) {
  // eslint-disable-next-line no-console
  console.log('Environment Configuration:', {
    apiBaseUrl: config.apiBaseUrl,
    cognitoRegion: config.cognito.region,
    appName: config.app.name,
    appVersion: config.app.version,
    isDevelopment: config.isDevelopment,
    isProduction: config.isProduction,
  });
}

export default config;
