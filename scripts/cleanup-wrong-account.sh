#!/bin/bash

# Script to clean up the wrong account deployment
# This empties S3 buckets before stack deletion

set -euo pipefail

# Wrong account details (to clean up)
WRONG_ACCOUNT_ID="161521808930"
REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Wrong Account Cleanup Script ===${NC}"
echo "This will clean up resources from account: ${WRONG_ACCOUNT_ID}"
echo "Region: ${REGION}"
echo ""

# Verify we're using the default profile (which points to wrong account)
current_account=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "FAILED")

if [ "$current_account" != "$WRONG_ACCOUNT_ID" ]; then
    echo -e "${RED}ERROR: Current account ($current_account) doesn't match expected wrong account ($WRONG_ACCOUNT_ID)${NC}"
    echo "This script should be run with default AWS profile pointing to account $WRONG_ACCOUNT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Connected to wrong account for cleanup: ${current_account}${NC}"
echo ""

# Function to empty S3 bucket
empty_s3_bucket() {
    local bucket_name="$1"

    echo -e "${YELLOW}Checking S3 bucket: ${bucket_name}${NC}"

    # Check if bucket exists
    if aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        echo "  Bucket exists, emptying..."

        # Delete all versions and delete markers
        aws s3api delete-objects \
            --bucket "$bucket_name" \
            --delete "$(aws s3api list-object-versions \
                --bucket "$bucket_name" \
                --output json \
                --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')" \
            2>/dev/null || echo "  No versions to delete"

        # Delete all current objects
        aws s3 rm "s3://$bucket_name" --recursive 2>/dev/null || echo "  No objects to delete"

        echo -e "${GREEN}  ✓ Bucket emptied${NC}"
    else
        echo "  Bucket does not exist or already deleted"
    fi
}

# List of S3 buckets that need to be emptied (based on naming convention)
S3_BUCKETS=(
    "ec2-manager-web-dev-${WRONG_ACCOUNT_ID}"
    "ec2-manager-audit-logs-dev-${WRONG_ACCOUNT_ID}"
    "ec2-manager-cicd-test-dev-${WRONG_ACCOUNT_ID}"
)

echo -e "${YELLOW}Emptying S3 buckets...${NC}"
for bucket in "${S3_BUCKETS[@]}"; do
    empty_s3_bucket "$bucket"
done

echo ""
echo -e "${YELLOW}Attempting to delete CloudFormation stack...${NC}"

# Try to delete the stack
aws cloudformation delete-stack \
    --stack-name EC2Manager-dev \
    --region "$REGION"

echo -e "${GREEN}✓ Stack deletion initiated${NC}"
echo ""
echo -e "${YELLOW}Monitoring stack deletion (this may take several minutes)...${NC}"

# Wait for stack deletion to complete
aws cloudformation wait stack-delete-complete \
    --stack-name EC2Manager-dev \
    --region "$REGION" \
    && echo -e "${GREEN}✓ Stack deletion completed successfully!${NC}" \
    || echo -e "${RED}Stack deletion failed or timed out${NC}"

echo ""
echo -e "${GREEN}Wrong account cleanup script completed!${NC}"