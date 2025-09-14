#!/bin/bash

# Environment Provisioning Script for EC2 Manager
# Usage: ./provision-env.sh <environment> [aws-profile]

set -e  # Exit on any error

ENVIRONMENT=$1
AWS_PROFILE=${2:-"default"}

if [[ -z "$ENVIRONMENT" ]]; then
    echo "Usage: $0 <environment> [aws-profile]"
    echo "Environments: dev, staging, prod"
    exit 1
fi

echo "🚀 Provisioning EC2 Manager environment: $ENVIRONMENT"
echo "📋 Using AWS Profile: $AWS_PROFILE"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Must be: dev, staging, or prod"
    exit 1
fi

# Set AWS profile
export AWS_PROFILE=$AWS_PROFILE

# Verify AWS credentials
echo "🔍 Verifying AWS credentials..."
aws sts get-caller-identity > /dev/null || {
    echo "❌ AWS credentials not configured or invalid"
    exit 1
}

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-west-2")

echo "✅ AWS Account: $ACCOUNT_ID"
echo "✅ Region: $REGION"

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure" || {
    echo "❌ Infrastructure directory not found"
    exit 1
}

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build infrastructure
echo "🔨 Building infrastructure..."
npm run build

# Pre-deployment validation
echo "🔍 Running pre-deployment validation..."

# Check for existing stack
STACK_NAME="EC2Manager-$ENVIRONMENT"
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &>/dev/null; then
    echo "⚠️  Stack $STACK_NAME already exists"
    echo "📊 Showing planned changes..."
    npm run diff -- --context environment=$ENVIRONMENT || true

    echo "❓ Continue with deployment? (y/N)"
    read -r CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
else
    echo "✅ New stack deployment"
fi

# Bootstrap CDK if needed (only for first deployment)
if [[ "$ENVIRONMENT" == "prod" ]] || ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$REGION" &>/dev/null; then
    echo "🏗️  Bootstrapping CDK..."
    npx cdk bootstrap aws://$ACCOUNT_ID/$REGION
fi

# Deploy infrastructure
echo "🚀 Deploying infrastructure..."

if [[ "$ENVIRONMENT" == "prod" ]]; then
    echo "⚠️  PRODUCTION DEPLOYMENT"
    echo "❓ Are you sure you want to deploy to production? (y/N)"
    read -r PROD_CONFIRM
    if [[ ! "$PROD_CONFIRM" =~ ^[Yy]$ ]]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi

    # Production deployment with extra validation
    npm run synth -- --context environment=$ENVIRONMENT
    npm run deploy -- --context environment=$ENVIRONMENT --require-approval never
else
    # Dev/Staging deployment
    npm run deploy -- --context environment=$ENVIRONMENT --require-approval never
fi

# Post-deployment validation
echo "🔍 Running post-deployment validation..."

# Wait for stack to be stable
echo "⏳ Waiting for stack to stabilize..."
aws cloudformation wait stack-deploy-complete --stack-name "$STACK_NAME" --region "$REGION"

# Get stack outputs
echo "📋 Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' \
    --output table

# Test basic connectivity
echo "🔍 Testing basic connectivity..."

# Get API Gateway URL from outputs
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [[ -n "$API_URL" ]]; then
    echo "🌐 Testing API Gateway: $API_URL"
    curl -f -s "$API_URL" > /dev/null && echo "✅ API Gateway accessible" || echo "⚠️  API Gateway not responding (expected for now)"
fi

# Generate environment file
echo "📝 Generating environment configuration..."

ENV_FILE="../.env.$ENVIRONMENT"
cat > "$ENV_FILE" << EOF
# Generated environment file for $ENVIRONMENT
# Generated on: $(date)

# AWS Configuration
AWS_PROFILE=$AWS_PROFILE
AWS_REGION=$REGION
AWS_ACCOUNT_ID=$ACCOUNT_ID

# Environment
NODE_ENV=$ENVIRONMENT
ENVIRONMENT=$ENVIRONMENT

# Stack Information
STACK_NAME=$STACK_NAME
STACK_REGION=$REGION

# Infrastructure Outputs (update these manually after first deployment)
API_ENDPOINT=https://$(echo "$API_URL" | cut -d'/' -f3 | cut -d'.' -f1).execute-api.$REGION.amazonaws.com/$ENVIRONMENT
COGNITO_USER_POOL_ID=us-west-2_PLACEHOLDER
COGNITO_CLIENT_ID=PLACEHOLDER_CLIENT_ID
CLOUDFRONT_DISTRIBUTION_ID=PLACEHOLDER_DISTRIBUTION_ID
AUDIT_TABLE_NAME=ec2-manager-audit-$ENVIRONMENT

# CDK Configuration
CDK_DEFAULT_ACCOUNT=$ACCOUNT_ID
CDK_DEFAULT_REGION=$REGION
EOF

echo "✅ Environment file created: $ENV_FILE"

# Create deployment summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Environment: $ENVIRONMENT"
echo "🏗️  Stack: $STACK_NAME"
echo "🌍 Region: $REGION"
echo "🔧 AWS Profile: $AWS_PROFILE"
echo "📁 Environment File: $ENV_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Next steps
echo ""
echo "📋 NEXT STEPS:"
echo "1. Update the environment file with actual resource IDs"
echo "2. Test the deployed infrastructure"
echo "3. Deploy application code"
echo ""

if [[ "$ENVIRONMENT" == "prod" ]]; then
    echo "⚠️  PRODUCTION ENVIRONMENT NOTES:"
    echo "• Monitor CloudWatch dashboards"
    echo "• Set up alerting notifications"
    echo "• Review security configurations"
    echo "• Schedule regular backups validation"
    echo ""
fi

echo "✅ Provisioning completed successfully!"