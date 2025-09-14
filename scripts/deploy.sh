#!/bin/bash

# Deployment script that enforces the correct AWS profile
# This prevents accidental deployments to wrong accounts

set -euo pipefail

# REQUIRED PROFILE - NEVER CHANGE THIS
REQUIRED_PROFILE="jnicamzn-sso-ec2"
EXPECTED_ACCOUNT_ID="357044226454"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== EC2Manager Deployment Script ===${NC}"
echo "Enforcing AWS profile: ${REQUIRED_PROFILE}"
echo "Expected Account ID: ${EXPECTED_ACCOUNT_ID}"
echo ""

# Function to validate AWS profile and account
validate_aws_profile() {
    echo -e "${YELLOW}Validating AWS profile...${NC}"

    # Check if profile exists by trying to get caller identity
    echo "Testing profile access..."

    # Get current account ID using the required profile
    local current_account_id
    current_account_id=$(aws sts get-caller-identity --profile "${REQUIRED_PROFILE}" --query 'Account' --output text 2>/dev/null || echo "FAILED")

    if [ "$current_account_id" == "FAILED" ]; then
        echo -e "${RED}ERROR: Failed to get account ID using profile '${REQUIRED_PROFILE}'${NC}"
        echo "Please check your AWS credentials and profile configuration."
        exit 1
    fi

    if [ "$current_account_id" != "$EXPECTED_ACCOUNT_ID" ]; then
        echo -e "${RED}ERROR: Account ID mismatch!${NC}"
        echo "Expected: ${EXPECTED_ACCOUNT_ID}"
        echo "Got:      ${current_account_id}"
        echo "Profile:  ${REQUIRED_PROFILE}"
        exit 1
    fi

    echo -e "${GREEN}✓ Profile validation successful${NC}"
    echo "  Profile: ${REQUIRED_PROFILE}"
    echo "  Account: ${current_account_id}"
    echo ""
}

# Function to build the CDK project
build_project() {
    echo -e "${YELLOW}Building CDK project...${NC}"
    cd infrastructure
    npm run build
    echo -e "${GREEN}✓ Build completed${NC}"
    echo ""
}

# Function to deploy using CDK
deploy_cdk() {
    local environment="${1:-dev}"

    echo -e "${YELLOW}Deploying to environment: ${environment}${NC}"
    echo "Using profile: ${REQUIRED_PROFILE}"

    # Double-check profile before deployment
    local verify_account
    verify_account=$(aws sts get-caller-identity --profile "${REQUIRED_PROFILE}" --query 'Account' --output text)

    if [ "$verify_account" != "$EXPECTED_ACCOUNT_ID" ]; then
        echo -e "${RED}CRITICAL ERROR: Account verification failed before deployment!${NC}"
        exit 1
    fi

    # Deploy with explicit profile
    npx cdk deploy \
        --profile "${REQUIRED_PROFILE}" \
        --require-approval never \
        --context environment="${environment}"

    echo -e "${GREEN}✓ Deployment completed successfully${NC}"
}

# Function to destroy stack (with safety checks)
destroy_stack() {
    local environment="${1:-dev}"

    echo -e "${RED}WARNING: This will destroy the ${environment} environment!${NC}"
    echo "Profile: ${REQUIRED_PROFILE}"
    echo "Account: ${EXPECTED_ACCOUNT_ID}"
    echo ""

    read -p "Are you sure? Type 'DELETE' to confirm: " confirmation
    if [ "$confirmation" != "DELETE" ]; then
        echo "Destruction cancelled."
        exit 0
    fi

    echo -e "${YELLOW}Destroying stack...${NC}"
    npx cdk destroy \
        --profile "${REQUIRED_PROFILE}" \
        --force \
        --context environment="${environment}"
}

# Main script logic
case "${1:-}" in
    "deploy")
        validate_aws_profile
        build_project
        deploy_cdk "${2:-dev}"
        ;;
    "destroy")
        validate_aws_profile
        destroy_stack "${2:-dev}"
        ;;
    "validate")
        validate_aws_profile
        ;;
    "build")
        build_project
        ;;
    *)
        echo "Usage: $0 {deploy|destroy|validate|build} [environment]"
        echo ""
        echo "Commands:"
        echo "  deploy [env]   - Deploy to specified environment (default: dev)"
        echo "  destroy [env]  - Destroy specified environment (default: dev)"
        echo "  validate       - Validate AWS profile and account"
        echo "  build          - Build the CDK project"
        echo ""
        echo "Examples:"
        echo "  $0 deploy dev"
        echo "  $0 deploy prod"
        echo "  $0 destroy dev"
        echo "  $0 validate"
        exit 1
        ;;
esac

echo -e "${GREEN}Script completed successfully!${NC}"