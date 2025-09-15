#!/usr/bin/env node
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'readonly';
  temporaryPassword: string;
}

// Pre-registered users as per data model requirements
const USERS: User[] = [
  {
    email: 'admin@ec2manager.com',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    temporaryPassword: 'AdminPass123!',
  },
  {
    email: 'readonly@ec2manager.com',
    firstName: 'Read',
    lastName: 'Only',
    role: 'readonly',
    temporaryPassword: 'ReadPass123!',
  },
  {
    email: 'manager@ec2manager.com',
    firstName: 'EC2',
    lastName: 'Manager',
    role: 'admin',
    temporaryPassword: 'ManagerPass123!',
  },
  {
    email: 'viewer@ec2manager.com',
    firstName: 'System',
    lastName: 'Viewer',
    role: 'readonly',
    temporaryPassword: 'ViewerPass123!',
  },
];

async function getStackOutputs(
  stackName: string
): Promise<{ userPoolId: string; clientId: string }> {
  const cfnClient = new CloudFormationClient({ region: 'us-west-2' });

  try {
    const response = await cfnClient.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    );

    if (!response.Stacks || response.Stacks.length === 0) {
      throw new Error(`Stack ${stackName} not found`);
    }

    const stack = response.Stacks[0];
    if (!stack) {
      throw new Error(`Stack ${stackName} not found`);
    }
    const outputs = stack.Outputs || [];

    const userPoolId = outputs.find(
      (output) => output.OutputKey === 'CognitoUserPoolId'
    )?.OutputValue;
    const clientId = outputs.find((output) => output.OutputKey === 'CognitoClientId')?.OutputValue;

    if (!userPoolId || !clientId) {
      throw new Error(
        'Required Cognito outputs not found in stack. Ensure stack is deployed with Cognito resources.'
      );
    }

    return { userPoolId, clientId };
  } catch (error) {
    console.error('Error retrieving stack outputs:', error);
    throw error;
  }
}

async function createUser(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  user: User
): Promise<void> {
  try {
    console.log(`Creating user: ${user.email} with role: ${user.role}`);

    // Create user with permanent password
    const createUserParams = {
      UserPoolId: userPoolId,
      Username: user.email,
      UserAttributes: [
        {
          Name: 'email',
          Value: user.email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
        {
          Name: 'given_name',
          Value: user.firstName,
        },
        {
          Name: 'family_name',
          Value: user.lastName,
        },
        {
          Name: 'custom:role',
          Value: user.role,
        },
      ],
      TemporaryPassword: user.temporaryPassword,
      MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
      ForceAliasCreation: false,
    };

    await cognitoClient.send(new AdminCreateUserCommand(createUserParams));

    // Set permanent password to avoid NEW_PASSWORD_REQUIRED challenge
    const setPasswordParams = {
      UserPoolId: userPoolId,
      Username: user.email,
      Password: user.temporaryPassword,
      Permanent: true,
    };

    await cognitoClient.send(new AdminSetUserPasswordCommand(setPasswordParams));
    console.log(`✓ User ${user.email} created successfully with permanent password`);
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      console.log(`⚠ User ${user.email} already exists, updating attributes...`);

      // Update existing user's custom attributes
      const updateParams = {
        UserPoolId: userPoolId,
        Username: user.email,
        UserAttributes: [
          {
            Name: 'custom:role',
            Value: user.role,
          },
          {
            Name: 'given_name',
            Value: user.firstName,
          },
          {
            Name: 'family_name',
            Value: user.lastName,
          },
        ],
      };

      await cognitoClient.send(new AdminUpdateUserAttributesCommand(updateParams));

      // Also set permanent password for existing users
      const setPasswordParams = {
        UserPoolId: userPoolId,
        Username: user.email,
        Password: user.temporaryPassword,
        Permanent: true,
      };

      await cognitoClient.send(new AdminSetUserPasswordCommand(setPasswordParams));
      console.log(`✓ User ${user.email} attributes updated and password set to permanent`);
    } else {
      console.error(`✗ Failed to create user ${user.email}:`, error.message);
      throw error;
    }
  }
}

async function main() {
  const environment = process.env.NODE_ENV || 'dev';
  const stackName = `EC2Manager-${environment}`;

  console.log(`🔄 Seeding users for environment: ${environment}`);
  console.log(`📋 Stack name: ${stackName}`);

  try {
    // Get Cognito details from CloudFormation stack outputs
    console.log('📡 Retrieving Cognito configuration from stack outputs...');
    const { userPoolId, clientId } = await getStackOutputs(stackName);

    console.log(`🎯 User Pool ID: ${userPoolId}`);
    console.log(`🔑 Client ID: ${clientId}`);

    // Initialize Cognito client
    const cognitoClient = new CognitoIdentityProviderClient({
      region: 'us-west-2',
    });

    // Create all users
    console.log(`👥 Creating ${USERS.length} users...`);

    for (const user of USERS) {
      await createUser(cognitoClient, userPoolId, user);
    }

    console.log('\n✅ User seeding completed successfully!');
    console.log('\n📋 Created users:');
    USERS.forEach((user) => {
      console.log(`   • ${user.email} (${user.role}) - temp password: ${user.temporaryPassword}`);
    });

    console.log('\n🔐 Note: Users must change their temporary passwords on first login.');
    console.log(`🌐 Hosted UI: Available via stack output "CognitoUserPoolDomain"`);
  } catch (error) {
    console.error('❌ User seeding failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as seedUsers, USERS };
