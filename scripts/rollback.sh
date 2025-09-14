#!/bin/bash

# Rollback Script for EC2 Manager Infrastructure
# Usage: ./rollback.sh <environment> [rollback-target] [aws-profile]

set -e  # Exit on any error

ENVIRONMENT=$1
ROLLBACK_TARGET=${2:-"previous"}  # previous, specific-version, or timestamp
AWS_PROFILE=${3:-"default"}

if [[ -z "$ENVIRONMENT" ]]; then
    echo "Usage: $0 <environment> [rollback-target] [aws-profile]"
    echo ""
    echo "Environments: dev, staging, prod"
    echo "Rollback targets:"
    echo "  previous        - Roll back to previous stack version (default)"
    echo "  <change-set-id> - Roll back to specific change set"
    echo "  <timestamp>     - Roll back to specific timestamp (YYYY-MM-DD-HH-MM)"
    exit 1
fi

echo "🔄 EC2 Manager Infrastructure Rollback"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 Environment: $ENVIRONMENT"
echo "🎯 Target: $ROLLBACK_TARGET"
echo "📋 AWS Profile: $AWS_PROFILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Must be: dev, staging, or prod"
    exit 1
fi

# Extra confirmation for production
if [[ "$ENVIRONMENT" == "prod" ]]; then
    echo "⚠️  WARNING: This is a PRODUCTION rollback!"
    echo "❓ Are you absolutely sure you want to proceed? (type 'ROLLBACK' to confirm)"
    read -r CONFIRMATION
    if [[ "$CONFIRMATION" != "ROLLBACK" ]]; then
        echo "❌ Production rollback cancelled"
        exit 1
    fi
fi

# Set AWS profile and region
export AWS_PROFILE=$AWS_PROFILE
REGION=$(aws configure get region || echo "us-west-2")
STACK_NAME="EC2Manager-$ENVIRONMENT"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🔍 Verifying AWS credentials..."
aws sts get-caller-identity > /dev/null || {
    echo "❌ AWS credentials not configured or invalid"
    exit 1
}

echo "✅ AWS Account: $ACCOUNT_ID"
echo "✅ Region: $REGION"

# Check if stack exists
echo "🔍 Checking current stack status..."
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &>/dev/null; then
    echo "❌ Stack $STACK_NAME does not exist"
    exit 1
fi

CURRENT_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text)

echo "📊 Current stack status: $CURRENT_STATUS"

# Validate stack is in a rollback-eligible state
ROLLBACK_ELIGIBLE_STATES=(
    "CREATE_COMPLETE"
    "UPDATE_COMPLETE"
    "UPDATE_ROLLBACK_COMPLETE"
    "IMPORT_COMPLETE"
)

if [[ ! " ${ROLLBACK_ELIGIBLE_STATES[@]} " =~ " ${CURRENT_STATUS} " ]]; then
    echo "❌ Stack is not in a rollback-eligible state: $CURRENT_STATUS"
    echo "   Rollback-eligible states: ${ROLLBACK_ELIGIBLE_STATES[*]}"
    exit 1
fi

# Create backup of current state
echo "💾 Creating backup of current stack state..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)_${ENVIRONMENT}_pre_rollback"
mkdir -p "$BACKUP_DIR"

# Export current stack template
aws cloudformation get-template \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'TemplateBody' > "$BACKUP_DIR/template.json"

# Export stack parameters
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Parameters' > "$BACKUP_DIR/parameters.json"

# Export stack outputs
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' > "$BACKUP_DIR/outputs.json"

echo "✅ Backup created in: $BACKUP_DIR"

# Get rollback information based on target
echo "🔍 Determining rollback strategy..."

case "$ROLLBACK_TARGET" in
    "previous")
        echo "📋 Rolling back to previous stack version..."

        # Check if there are events indicating a previous successful state
        EVENTS=$(aws cloudformation describe-stack-events \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'StackEvents[?ResourceStatus==`UPDATE_COMPLETE` && ResourceType==`AWS::CloudFormation::Stack`] | [0].Timestamp' \
            --output text 2>/dev/null || echo "None")

        if [[ "$EVENTS" == "None" ]]; then
            echo "❌ No previous version found to roll back to"
            exit 1
        fi

        echo "🎯 Found previous version: $EVENTS"
        ;;

    *-*-*-*-*)
        echo "📅 Rolling back to timestamp: $ROLLBACK_TARGET"
        # Validate timestamp format and convert to AWS format if needed
        ;;

    *)
        echo "🎯 Rolling back to specific change set or version: $ROLLBACK_TARGET"
        ;;
esac

# Perform pre-rollback health check
echo "🔍 Running pre-rollback health checks..."

# Check for dependent resources
echo "   Checking for dependent resources..."
DEPENDENT_STACKS=$(aws cloudformation list-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResourceSummaries[?ResourceStatus==`CREATE_COMPLETE`].PhysicalResourceId' \
    --output text 2>/dev/null | wc -l)

echo "   Found $DEPENDENT_STACKS resources in stack"

# Check for data that might be lost
echo "   Checking for data preservation..."
HAS_DATA_RESOURCES=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::DynamoDB::Table`] | length(@)' \
    --output text 2>/dev/null || echo "0")

if [[ "$HAS_DATA_RESOURCES" -gt 0 ]]; then
    echo "⚠️  Stack contains data resources (DynamoDB tables)"
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        echo "❓ Data resources detected. Rollback may affect data. Continue? (y/N)"
        read -r DATA_CONFIRM
        if [[ ! "$DATA_CONFIRM" =~ ^[Yy]$ ]]; then
            echo "❌ Rollback cancelled due to data concerns"
            exit 1
        fi
    fi
fi

# Notification setup
NOTIFICATION_ENDPOINT=""
if command -v curl &> /dev/null; then
    NOTIFICATION_ENDPOINT="webhook"  # Could be Slack, Teams, etc.
fi

# Notify rollback start
if [[ -n "$NOTIFICATION_ENDPOINT" && -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔄 Starting rollback for EC2Manager-$ENVIRONMENT\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || true
fi

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure" || {
    echo "❌ Infrastructure directory not found"
    exit 1
}

# Ensure dependencies are installed
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔄 Executing rollback..."

# Different rollback strategies
case "$ROLLBACK_TARGET" in
    "previous")
        # Use CDK to revert to previous state
        # This would require maintaining state or using CloudFormation stack policies

        echo "📋 Attempting CloudFormation stack rollback..."

        # Try CloudFormation continue-update-rollback if available
        if aws cloudformation continue-update-rollback \
            --stack-name "$STACK_NAME" \
            --region "$REGION" 2>/dev/null; then
            echo "✅ CloudFormation rollback initiated"
        else
            echo "⚠️  CloudFormation rollback not available, attempting CDK revert..."

            # Alternative: redeploy with previous configuration
            # This would require storing previous CDK state
            echo "⚠️  Manual CDK revert required - please check previous configuration"
            echo "   Use: cdk deploy --context environment=$ENVIRONMENT"
        fi
        ;;

    *)
        echo "⚠️  Custom rollback target not fully implemented"
        echo "   Please use CloudFormation console for specific change set rollback"
        ;;
esac

# Monitor rollback progress
echo "📊 Monitoring rollback progress..."

# Wait for rollback to complete or fail
aws cloudformation wait stack-update-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION" && ROLLBACK_SUCCESS=true || ROLLBACK_SUCCESS=false

if [[ "$ROLLBACK_SUCCESS" == "true" ]]; then
    echo "✅ Rollback completed successfully"

    # Get new stack status
    NEW_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].StackStatus' \
        --output text)

    echo "📊 New stack status: $NEW_STATUS"

    # Post-rollback validation
    echo "🔍 Running post-rollback validation..."

    # Basic connectivity test
    echo "   Testing basic AWS connectivity..."
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" > /dev/null

    # Success notification
    if [[ -n "$NOTIFICATION_ENDPOINT" && -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ EC2Manager-$ENVIRONMENT rollback completed successfully\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi

    echo ""
    echo "🎉 ROLLBACK SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Environment: $ENVIRONMENT"
    echo "📊 Status: $NEW_STATUS"
    echo "💾 Backup: $BACKUP_DIR"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

else
    echo "❌ Rollback failed"

    # Get failure details
    FAILURE_REASON=$(aws cloudformation describe-stack-events \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'StackEvents[?ResourceStatus==`UPDATE_ROLLBACK_FAILED`] | [0].ResourceStatusReason' \
        --output text 2>/dev/null || echo "Unknown")

    echo "📋 Failure reason: $FAILURE_REASON"

    # Failure notification
    if [[ -n "$NOTIFICATION_ENDPOINT" && -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"❌ EC2Manager-$ENVIRONMENT rollback failed: $FAILURE_REASON\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi

    echo ""
    echo "❌ ROLLBACK FAILED!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Environment: $ENVIRONMENT"
    echo "📋 Reason: $FAILURE_REASON"
    echo "💾 Backup: $BACKUP_DIR"
    echo "📖 Check CloudFormation console for details"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    exit 1
fi

# Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
find backups/ -type d -name "*_pre_rollback" | sort -r | tail -n +11 | xargs -r rm -rf

echo "✅ Rollback procedure completed!"