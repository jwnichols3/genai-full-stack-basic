#!/usr/bin/env python3
"""
Frontend deployment script for EC2 Manager
Builds the frontend app and deploys to S3/CloudFront
"""

import os
import sys
import subprocess
import json
import argparse
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError


def run_command(command, cwd=None, check=True):
    """Run shell command and return result"""
    print(f"Running: {command}")
    result = subprocess.run(
        command,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=check
    )

    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(f"ERROR: {result.stderr}")

    return result


def get_stack_outputs(stack_name, profile=None):
    """Get CloudFormation stack outputs"""
    try:
        session = boto3.Session(profile_name=profile)
        cf_client = session.client('cloudformation')

        response = cf_client.describe_stacks(StackName=stack_name)
        outputs = {}

        if 'Stacks' in response and response['Stacks']:
            stack = response['Stacks'][0]
            if 'Outputs' in stack:
                for output in stack['Outputs']:
                    outputs[output['OutputKey']] = output['OutputValue']

        return outputs
    except ClientError as e:
        print(f"Error getting stack outputs: {e}")
        return {}


def build_frontend():
    """Build the frontend application"""
    print("\n=== Building Frontend ===")

    # Ensure we're in project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    # Run frontend build
    result = run_command("npm run build:web")
    if result.returncode != 0:
        print("Frontend build failed!")
        sys.exit(1)

    print("✓ Frontend build completed")


def sync_to_s3(bucket_name, dist_path, profile=None):
    """Sync built files to S3 bucket"""
    print(f"\n=== Syncing to S3: {bucket_name} ===")

    # Use AWS CLI for efficient sync
    aws_command = "aws s3 sync"
    if profile:
        aws_command += f" --profile {profile}"

    # Sync with proper cache headers
    sync_cmd = f"{aws_command} {dist_path} s3://{bucket_name} --delete --exact-timestamps"

    # Set cache control for different file types
    result = run_command(sync_cmd)
    if result.returncode != 0:
        print("S3 sync failed!")
        sys.exit(1)

    # Set no-cache for index.html
    no_cache_cmd = f"{aws_command} s3:///{bucket_name}/index.html s3://{bucket_name}/index.html --cache-control 'no-cache, no-store, must-revalidate'"
    run_command(no_cache_cmd, check=False)  # Don't fail if this doesn't work

    print("✓ S3 sync completed")


def invalidate_cloudfront(distribution_id, profile=None):
    """Create CloudFront invalidation"""
    print(f"\n=== Invalidating CloudFront: {distribution_id} ===")

    try:
        session = boto3.Session(profile_name=profile)
        cf_client = session.client('cloudfront')

        response = cf_client.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 1,
                    'Items': ['/*']
                },
                'CallerReference': str(hash(f"{distribution_id}-{os.getpid()}"))
            }
        )

        invalidation_id = response['Invalidation']['Id']
        print(f"✓ CloudFront invalidation created: {invalidation_id}")

    except ClientError as e:
        print(f"CloudFront invalidation failed: {e}")
        # Don't exit - deployment can succeed without invalidation


def inject_environment_variables(environment):
    """Inject environment variables for build"""
    print(f"\n=== Setting Environment Variables for {environment} ===")

    # Set Vite environment variables
    env_vars = {
        'VITE_AWS_REGION': 'us-west-2',
        'NODE_ENV': 'production' if environment == 'prod' else 'development'
    }

    # Load from .env files if they exist
    env_file = Path(f".env.{environment}")
    if env_file.exists():
        print(f"Loading environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value

    # Set environment variables
    for key, value in env_vars.items():
        os.environ[key] = value
        print(f"  {key}={value}")

    print("✓ Environment variables set")


def main():
    parser = argparse.ArgumentParser(description='Deploy frontend to S3/CloudFront')
    parser.add_argument('environment', choices=['dev', 'prod'], help='Environment to deploy to')
    parser.add_argument('--profile', default='jnicamzn-sso-ec2', help='AWS profile to use')
    parser.add_argument('--skip-build', action='store_true', help='Skip frontend build')
    parser.add_argument('--skip-invalidation', action='store_true', help='Skip CloudFront invalidation')

    args = parser.parse_args()

    print(f"=== EC2 Manager Frontend Deployment ===")
    print(f"Environment: {args.environment}")
    print(f"AWS Profile: {args.profile}")
    print("")

    # Verify AWS credentials
    try:
        session = boto3.Session(profile_name=args.profile)
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        print(f"AWS Account: {identity['Account']}")
        print(f"AWS User: {identity.get('UserId', 'Unknown')}")
        print("")
    except (ClientError, NoCredentialsError) as e:
        print(f"ERROR: AWS credentials not available: {e}")
        sys.exit(1)

    # Get stack outputs
    stack_name = f"EC2Manager-Web-{args.environment}"
    print(f"Getting outputs from stack: {stack_name}")
    outputs = get_stack_outputs(stack_name, args.profile)

    if not outputs:
        print(f"ERROR: Could not get outputs from stack {stack_name}")
        print("Make sure the web stack is deployed first!")
        sys.exit(1)

    bucket_name = outputs.get('S3BucketName')
    distribution_id = outputs.get('DistributionId')
    cloudfront_url = outputs.get('CloudFrontURL')

    if not bucket_name or not distribution_id:
        print("ERROR: Missing required stack outputs (S3BucketName, DistributionId)")
        sys.exit(1)

    print(f"S3 Bucket: {bucket_name}")
    print(f"CloudFront Distribution: {distribution_id}")
    print(f"CloudFront URL: {cloudfront_url}")
    print("")

    # Inject environment variables
    inject_environment_variables(args.environment)

    # Build frontend
    if not args.skip_build:
        build_frontend()
    else:
        print("Skipping frontend build...")

    # Sync to S3
    dist_path = "apps/web/dist"
    if not Path(dist_path).exists():
        print(f"ERROR: Build output directory {dist_path} does not exist!")
        print("Run build first or use --skip-build option carefully.")
        sys.exit(1)

    sync_to_s3(bucket_name, dist_path, args.profile)

    # Invalidate CloudFront
    if not args.skip_invalidation:
        invalidate_cloudfront(distribution_id, args.profile)
    else:
        print("Skipping CloudFront invalidation...")

    print("\n=== Deployment Complete ===")
    print(f"Your app is available at: {cloudfront_url}")
    print("")
    print("Note: CloudFront changes may take 5-15 minutes to propagate globally.")


if __name__ == "__main__":
    main()