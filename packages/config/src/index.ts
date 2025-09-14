export interface AppConfig {
  environment: 'development' | 'production' | 'test';
  aws: {
    region: string;
    profile?: string;
  };
  api: {
    endpoint: string;
    timeout: number;
  };
  dynamodb: {
    auditTableName: string;
  };
  cognito: {
    userPoolId?: string;
    clientId?: string;
  };
}

export const getConfig = (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';

  return {
    environment: env as AppConfig['environment'],
    aws: {
      region: process.env.AWS_REGION || 'us-west-2',
      profile: process.env.AWS_PROFILE,
    },
    api: {
      endpoint: process.env.API_ENDPOINT || 'http://localhost:3000',
      timeout: 30000,
    },
    dynamodb: {
      auditTableName: process.env.AUDIT_TABLE_NAME || `ec2-manager-audit-${env}`,
    },
    cognito: {
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      clientId: process.env.COGNITO_CLIENT_ID,
    },
  };
};
