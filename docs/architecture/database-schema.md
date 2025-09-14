# Database Schema

## DynamoDB Audit Table

```javascript
// Table: ec2-audit-logs
{
  TableName: 'ec2-audit-logs',
  KeySchema: [
    { AttributeName: 'userId', KeyType: 'HASH' },     // Partition key
    { AttributeName: 'timestamp', KeyType: 'RANGE' }  // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'userId', AttributeType: 'S' },
    { AttributeName: 'timestamp', AttributeType: 'S' },
    { AttributeName: 'action', AttributeType: 'S' },
    { AttributeName: 'resourceId', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'ActionIndex',
      Keys: [
        { AttributeName: 'action', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    },
    {
      IndexName: 'ResourceIndex',
      Keys: [
        { AttributeName: 'resourceId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ],
  BillingMode: 'PAY_PER_REQUEST',  // On-demand pricing
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  },
  Tags: [
    { Key: 'Environment', Value: 'Production' },
    { Key: 'Application', Value: 'EC2-Manager' }
  ]
}

// Example Item Structure
{
  "userId": "cognito-user-uuid",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "action": "REBOOT_INSTANCE",
  "resourceType": "EC2_INSTANCE",
  "resourceId": "i-1234567890abcdef0",
  "userEmail": "admin@example.com",
  "details": {
    "instanceType": "t2.micro",
    "previousState": "running",
    "region": "us-east-1",
    "reason": "Scheduled maintenance"
  },
  "ipAddress": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "ttl": 2678400  // 31 days retention (optional)
}
```

## Cognito User Attributes Schema

```javascript
// User Pool Attributes
{
  StandardAttributes: {
    email: { required: true, mutable: false },
    email_verified: { required: true },
    given_name: { required: true, mutable: true },
    family_name: { required: true, mutable: true }
  },
  CustomAttributes: {
    'custom:role': {
      type: 'String',
      mutable: false,
      required: true,
      constraints: {
        enum: ['admin', 'readonly']
      }
    },
    'custom:department': {
      type: 'String',
      mutable: true,
      required: false
    }
  },
  PasswordPolicy: {
    minimumLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    temporaryPasswordValidityDays: 7
  },
  MfaConfiguration: 'OPTIONAL',  // For future enhancement
  AccountRecoverySetting: {
    recoveryMechanisms: [
      { priority: 1, name: 'verified_email' }
    ]
  }
}
```
