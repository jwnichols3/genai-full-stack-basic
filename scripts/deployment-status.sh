#!/bin/bash

# Deployment Status Check Script for EC2 Manager
# Usage: ./deployment-status.sh <environment> [check-type] [aws-profile]

set -e

ENVIRONMENT=$1
CHECK_TYPE=${2:-"all"}  # all, infrastructure, application, health
AWS_PROFILE=${3:-"default"}

if [[ -z "$ENVIRONMENT" ]]; then
    echo "Usage: $0 <environment> [check-type] [aws-profile]"
    echo ""
    echo "Environments: dev, staging, prod"
    echo "Check types: all, infrastructure, application, health"
    exit 1
fi

echo "📊 EC2 Manager Deployment Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 Environment: $ENVIRONMENT"
echo "🔍 Check Type: $CHECK_TYPE"
echo "📋 AWS Profile: $AWS_PROFILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set AWS profile and region
export AWS_PROFILE=$AWS_PROFILE
REGION=$(aws configure get region || echo "us-west-2")
STACK_NAME="EC2Manager-$ENVIRONMENT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status tracking
OVERALL_STATUS="HEALTHY"
ISSUES_FOUND=()

check_aws_connectivity() {
    echo -e "${BLUE}🔌 Checking AWS connectivity...${NC}"

    if aws sts get-caller-identity --region "$REGION" &>/dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        echo -e "   ${GREEN}✅ AWS connectivity: OK${NC}"
        echo -e "   ${BLUE}📋 Account: $ACCOUNT_ID${NC}"
        echo -e "   ${BLUE}📋 Region: $REGION${NC}"
        return 0
    else
        echo -e "   ${RED}❌ AWS connectivity: FAILED${NC}"
        ISSUES_FOUND+=("AWS connectivity failed")
        OVERALL_STATUS="UNHEALTHY"
        return 1
    fi
}

check_infrastructure() {
    echo -e "${BLUE}🏗️  Checking infrastructure status...${NC}"

    # Check CloudFormation stack
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &>/dev/null; then
        STACK_STATUS=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text)

        case "$STACK_STATUS" in
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                echo -e "   ${GREEN}✅ CloudFormation stack: $STACK_STATUS${NC}"
                ;;
            "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
                echo -e "   ${YELLOW}⏳ CloudFormation stack: $STACK_STATUS${NC}"
                OVERALL_STATUS="DEPLOYING"
                ;;
            "*ROLLBACK*"|"*FAILED*")
                echo -e "   ${RED}❌ CloudFormation stack: $STACK_STATUS${NC}"
                ISSUES_FOUND+=("CloudFormation stack in failed state: $STACK_STATUS")
                OVERALL_STATUS="UNHEALTHY"
                ;;
            *)
                echo -e "   ${YELLOW}⚠️  CloudFormation stack: $STACK_STATUS${NC}"
                ISSUES_FOUND+=("CloudFormation stack in unexpected state: $STACK_STATUS")
                OVERALL_STATUS="WARNING"
                ;;
        esac

        # Get stack outputs
        echo -e "${BLUE}📋 Stack outputs:${NC}"
        aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
            --output table 2>/dev/null || echo "   No outputs available"

    else
        echo -e "   ${RED}❌ CloudFormation stack: NOT FOUND${NC}"
        ISSUES_FOUND+=("CloudFormation stack does not exist")
        OVERALL_STATUS="UNHEALTHY"
        return 1
    fi

    # Check individual resources
    echo -e "${BLUE}🔍 Checking critical resources...${NC}"

    # DynamoDB Table
    TABLE_NAME="ec2-manager-audit-$ENVIRONMENT"
    if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
        TABLE_STATUS=$(aws dynamodb describe-table \
            --table-name "$TABLE_NAME" \
            --region "$REGION" \
            --query 'Table.TableStatus' \
            --output text)

        if [[ "$TABLE_STATUS" == "ACTIVE" ]]; then
            echo -e "   ${GREEN}✅ DynamoDB table: $TABLE_STATUS${NC}"
        else
            echo -e "   ${YELLOW}⚠️  DynamoDB table: $TABLE_STATUS${NC}"
            ISSUES_FOUND+=("DynamoDB table not active: $TABLE_STATUS")
            OVERALL_STATUS="WARNING"
        fi
    else
        echo -e "   ${RED}❌ DynamoDB table: NOT FOUND${NC}"
        ISSUES_FOUND+=("DynamoDB table does not exist")
        OVERALL_STATUS="UNHEALTHY"
    fi

    # S3 Bucket
    BUCKET_NAME="ec2-manager-web-$ENVIRONMENT-$(aws sts get-caller-identity --query Account --output text)"
    if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" &>/dev/null; then
        echo -e "   ${GREEN}✅ S3 bucket: EXISTS${NC}"
    else
        echo -e "   ${RED}❌ S3 bucket: NOT FOUND${NC}"
        ISSUES_FOUND+=("S3 bucket does not exist")
        OVERALL_STATUS="UNHEALTHY"
    fi

    # API Gateway
    API_NAME="ec2-manager-api-$ENVIRONMENT"
    API_EXISTS=$(aws apigateway get-rest-apis \
        --region "$REGION" \
        --query "items[?name=='$API_NAME'] | length(@)" \
        --output text 2>/dev/null || echo "0")

    if [[ "$API_EXISTS" -gt 0 ]]; then
        echo -e "   ${GREEN}✅ API Gateway: EXISTS${NC}"
    else
        echo -e "   ${RED}❌ API Gateway: NOT FOUND${NC}"
        ISSUES_FOUND+=("API Gateway does not exist")
        OVERALL_STATUS="UNHEALTHY"
    fi

    return 0
}

check_application() {
    echo -e "${BLUE}🚀 Checking application status...${NC}"

    # This would check application-specific health
    # For now, we'll simulate basic checks

    # Check if API is responding (when implemented)
    # API_URL="https://api-$ENVIRONMENT.ec2manager.com/health"
    # if curl -f -s "$API_URL" &>/dev/null; then
    #     echo -e "   ${GREEN}✅ API health: OK${NC}"
    # else
    #     echo -e "   ${RED}❌ API health: FAILED${NC}"
    #     ISSUES_FOUND+=("API health check failed")
    #     OVERALL_STATUS="UNHEALTHY"
    # fi

    echo -e "   ${BLUE}ℹ️  Application health checks not yet implemented${NC}"

    return 0
}

check_monitoring() {
    echo -e "${BLUE}📊 Checking monitoring and alarms...${NC}"

    # Check CloudWatch alarms
    ALARM_PREFIX="EC2Manager-$ENVIRONMENT"
    ALARMS=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "$ALARM_PREFIX" \
        --region "$REGION" \
        --query 'MetricAlarms[*].[AlarmName,StateValue]' \
        --output text 2>/dev/null || echo "")

    if [[ -n "$ALARMS" ]]; then
        echo -e "   ${BLUE}📊 CloudWatch alarms:${NC}"
        while IFS=$'\t' read -r alarm_name state_value; do
            case "$state_value" in
                "OK")
                    echo -e "   ${GREEN}✅ $alarm_name: $state_value${NC}"
                    ;;
                "ALARM")
                    echo -e "   ${RED}❌ $alarm_name: $state_value${NC}"
                    ISSUES_FOUND+=("CloudWatch alarm in ALARM state: $alarm_name")
                    OVERALL_STATUS="UNHEALTHY"
                    ;;
                "INSUFFICIENT_DATA")
                    echo -e "   ${YELLOW}⚠️  $alarm_name: $state_value${NC}"
                    ;;
            esac
        done <<< "$ALARMS"
    else
        echo -e "   ${YELLOW}⚠️  No CloudWatch alarms found${NC}"
    fi

    # Check dashboard
    DASHBOARD_NAME="EC2Manager-$ENVIRONMENT"
    if aws cloudwatch get-dashboard \
        --dashboard-name "$DASHBOARD_NAME" \
        --region "$REGION" &>/dev/null; then
        echo -e "   ${GREEN}✅ CloudWatch dashboard: EXISTS${NC}"
    else
        echo -e "   ${YELLOW}⚠️  CloudWatch dashboard: NOT FOUND${NC}"
    fi

    return 0
}

check_security() {
    echo -e "${BLUE}🔐 Checking security configuration...${NC}"

    # Check IAM roles
    ROLE_PREFIX="ec2-manager"
    ROLES=$(aws iam list-roles \
        --query "Roles[?contains(RoleName, '$ROLE_PREFIX-$ENVIRONMENT')].RoleName" \
        --output text 2>/dev/null || echo "")

    if [[ -n "$ROLES" ]]; then
        echo -e "   ${GREEN}✅ IAM roles: CONFIGURED${NC}"
        echo -e "   ${BLUE}📋 Found roles: $ROLES${NC}"
    else
        echo -e "   ${YELLOW}⚠️  IAM roles: NOT FOUND${NC}"
    fi

    # Check encryption settings (would need more specific checks)
    echo -e "   ${BLUE}ℹ️  Security audit checks not yet implemented${NC}"

    return 0
}

generate_report() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "📋 ${BLUE}DEPLOYMENT STATUS REPORT${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    case "$OVERALL_STATUS" in
        "HEALTHY")
            echo -e "🎉 ${GREEN}Overall Status: HEALTHY${NC}"
            echo -e "✅ All systems are operational"
            ;;
        "WARNING")
            echo -e "⚠️  ${YELLOW}Overall Status: WARNING${NC}"
            echo -e "⚠️  Some non-critical issues found"
            ;;
        "UNHEALTHY")
            echo -e "🚨 ${RED}Overall Status: UNHEALTHY${NC}"
            echo -e "❌ Critical issues require immediate attention"
            ;;
        "DEPLOYING")
            echo -e "⏳ ${YELLOW}Overall Status: DEPLOYING${NC}"
            echo -e "🚀 Deployment in progress"
            ;;
    esac

    echo ""
    echo -e "${BLUE}📋 Environment Details:${NC}"
    echo "   Environment: $ENVIRONMENT"
    echo "   Stack Name: $STACK_NAME"
    echo "   Region: $REGION"
    echo "   Check Time: $(date)"

    if [[ ${#ISSUES_FOUND[@]} -gt 0 ]]; then
        echo ""
        echo -e "${RED}❌ Issues Found:${NC}"
        for issue in "${ISSUES_FOUND[@]}"; do
            echo "   • $issue"
        done
    fi

    echo ""
    echo -e "${BLUE}💡 Next Steps:${NC}"
    if [[ "$OVERALL_STATUS" == "UNHEALTHY" ]]; then
        echo "   1. Review the issues listed above"
        echo "   2. Check CloudFormation events for errors"
        echo "   3. Consider rolling back if in production"
        echo "   4. Run: ./scripts/rollback.sh $ENVIRONMENT"
    elif [[ "$OVERALL_STATUS" == "WARNING" ]]; then
        echo "   1. Monitor the warnings listed above"
        echo "   2. Consider addressing non-critical issues"
        echo "   3. Run health checks again in 10 minutes"
    else
        echo "   ✅ No immediate action required"
        echo "   📊 Continue monitoring through CloudWatch dashboard"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Exit code based on status
    case "$OVERALL_STATUS" in
        "HEALTHY"|"DEPLOYING") exit 0 ;;
        "WARNING") exit 1 ;;
        "UNHEALTHY") exit 2 ;;
    esac
}

# Main execution
case "$CHECK_TYPE" in
    "all")
        check_aws_connectivity
        check_infrastructure
        check_application
        check_monitoring
        check_security
        ;;
    "infrastructure")
        check_aws_connectivity
        check_infrastructure
        ;;
    "application")
        check_aws_connectivity
        check_application
        ;;
    "health")
        check_aws_connectivity
        check_monitoring
        ;;
    *)
        echo "❌ Invalid check type: $CHECK_TYPE"
        echo "Valid types: all, infrastructure, application, health"
        exit 1
        ;;
esac

generate_report