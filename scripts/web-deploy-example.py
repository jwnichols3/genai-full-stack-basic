#!/usr/bin/env python3
"""
Web deployment script for the EBS Performance Suite frontend.
Deploys Next.js application to S3/CloudFront using CDK stack outputs.
"""

import os
import sys
import subprocess
import time
import json
import argparse
import re
from typing import Dict, Any, Optional, Tuple


class WebDeployer:
    """Handles deployment of the frontend web application to AWS."""
    
    def __init__(self, environment: str, profile: Optional[str] = None, region: Optional[str] = None):
        self.environment = environment
        self.profile = profile or "jnicamzn-sso-ec2"
        self.region = region or "us-west-2"
        self.stack_name = f"EbsPerf-{environment}-Stack"
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.frontend_dir = os.path.join(self.project_root, "frontend")
        self.build_output_dir = os.path.join(self.frontend_dir, "out")
        
    def log(self, message: str, level: str = "INFO") -> None:
        """Log a message with timestamp and level."""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_command(self, cmd: list[str], cwd: Optional[str] = None, capture_output: bool = False) -> subprocess.CompletedProcess:
        """Run a command with error handling."""
        cmd_str = " ".join(cmd)
        if cwd:
            self.log(f"Running: {cmd_str} (in {cwd})")
        else:
            self.log(f"Running: {cmd_str}")
            
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=capture_output,
                text=True,
                check=True
            )
            return result
        except subprocess.CalledProcessError as e:
            self.log(f"Command failed: {cmd_str}", "ERROR")
            if capture_output:
                self.log(f"stdout: {e.stdout}", "ERROR")
                self.log(f"stderr: {e.stderr}", "ERROR")
            sys.exit(1)
            
    def validate_prerequisites(self) -> None:
        """Validate that required tools are available."""
        self.log("Validating prerequisites...")
        
        # Check for required commands
        required_commands = ["aws", "npm"]
        for cmd in required_commands:
            try:
                subprocess.run([cmd, "--version"], capture_output=True, check=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                self.log(f"Required command '{cmd}' not found. Please install it.", "ERROR")
                sys.exit(1)
                
        # Check for frontend directory
        if not os.path.exists(self.frontend_dir):
            self.log(f"Frontend directory not found: {self.frontend_dir}", "ERROR")
            sys.exit(1)
            
        # Check for package.json
        package_json_path = os.path.join(self.frontend_dir, "package.json")
        if not os.path.exists(package_json_path):
            self.log(f"package.json not found: {package_json_path}", "ERROR")
            sys.exit(1)
            
        self.log("Prerequisites validated successfully")
        
    def get_stack_outputs(self) -> Dict[str, str]:
        """Get CDK stack outputs for S3 bucket and CloudFront distribution."""
        self.log(f"Getting stack outputs for {self.stack_name}...")
        
        cmd = [
            "aws", "cloudformation", "describe-stacks",
            "--stack-name", self.stack_name,
            "--query", "Stacks[0].Outputs",
            "--output", "json",
            "--profile", self.profile,
            "--region", self.region
        ]
        
        try:
            result = self.run_command(cmd, capture_output=True)
            outputs_list = json.loads(result.stdout)
        except subprocess.CalledProcessError:
            self.log(f"Failed to get stack outputs for {self.stack_name}. Make sure the stack is deployed.", "ERROR")
            sys.exit(1)
            
        # Convert to dictionary
        outputs = {output["OutputKey"]: output["OutputValue"] for output in outputs_list}
        
        # Log available outputs for debugging
        self.log("Available stack outputs:")
        for key, value in outputs.items():
            self.log(f"  {key}: {value}")
            
        return outputs
        
    def verify_bucket_exists(self, bucket_name: str) -> None:
        """Verify that the S3 bucket exists and is accessible."""
        self.log(f"Verifying bucket exists: {bucket_name}")
        
        cmd = [
            "aws", "s3", "ls", f"s3://{bucket_name}/",
            "--profile", self.profile,
            "--region", self.region
        ]
        
        try:
            self.run_command(cmd, capture_output=True)
            self.log(f"Bucket verified: {bucket_name}")
        except subprocess.CalledProcessError:
            self.log(f"Bucket does not exist or is not accessible: {bucket_name}", "ERROR")
            sys.exit(1)
        
    def extract_deployment_info(self, outputs: Dict[str, str]) -> Tuple[str, str]:
        """Extract S3 bucket name and CloudFront domain from stack outputs."""
        self.log("Extracting deployment information from stack outputs...")
        
        # Look for frontend bucket output
        frontend_bucket = None
        for key, value in outputs.items():
            if "FrontendBucketName" in key:
                frontend_bucket = value
                break
                
        if not frontend_bucket:
            self.log("Frontend bucket name not found in stack outputs, trying fallback naming pattern")
            # Fallback to expected bucket naming pattern
            expected_bucket = f"ebs-perf-{self.environment}-frontend"
            self.log(f"Using fallback bucket name: {expected_bucket}")
            
            # Verify the bucket exists
            self.verify_bucket_exists(expected_bucket)
            frontend_bucket = expected_bucket
            
        # Look for CloudFront distribution domain
        cloudfront_domain = None
        for key, value in outputs.items():
            if "DistributionDomainName" in key:
                cloudfront_domain = value
                break
                
        if not cloudfront_domain:
            self.log("CloudFront domain name not found in stack outputs", "ERROR")
            self.log("Expected output key containing 'DistributionDomainName'", "ERROR")
            sys.exit(1)
            
        self.log(f"Found S3 bucket: {frontend_bucket}")
        self.log(f"Found CloudFront domain: {cloudfront_domain}")
        
        return frontend_bucket, cloudfront_domain
        
    def build_frontend(self) -> None:
        """Build the Next.js frontend application."""
        self.log("Building frontend application...")
        
        # Check if build output already exists and has files
        if os.path.exists(self.build_output_dir):
            build_files = os.listdir(self.build_output_dir)
            if build_files:
                self.log(f"Build output already exists with {len(build_files)} files. Skipping build.")
                self.log(f"Using existing build output in: {self.build_output_dir}")
                return
        
        # Run npm install first to ensure dependencies are up to date
        self.log("Installing dependencies...")
        self.run_command(["npm", "ci"], cwd=self.frontend_dir)
        
        # Run the build
        self.log("Building application...")
        try:
            self.run_command(["npm", "run", "build"], cwd=self.frontend_dir)
        except SystemExit:
            # Build failed, check if we have any build output we can use
            if os.path.exists(self.build_output_dir):
                build_files = os.listdir(self.build_output_dir)
                if build_files:
                    self.log("Build failed, but found existing build output. Continuing with existing files.", "WARNING")
                    return
            # No build output available, cannot continue
            self.log("Build failed and no existing build output found. Cannot deploy.", "ERROR")
            sys.exit(1)
        
        # Verify build output exists
        if not os.path.exists(self.build_output_dir):
            self.log(f"Build output directory not found: {self.build_output_dir}", "ERROR")
            sys.exit(1)
            
        # Check if build output has files
        build_files = os.listdir(self.build_output_dir)
        if not build_files:
            self.log(f"Build output directory is empty: {self.build_output_dir}", "ERROR")
            sys.exit(1)
            
        self.log(f"Frontend build completed successfully. Output in: {self.build_output_dir}")
        
    def sync_to_s3(self, bucket_name: str) -> None:
        """Sync built files to S3 bucket."""
        self.log(f"Syncing files to S3 bucket: {bucket_name}")
        
        cmd = [
            "aws", "s3", "sync",
            self.build_output_dir + "/",  # Source directory with trailing slash
            f"s3://{bucket_name}/",       # Destination with trailing slash
            "--delete",                   # Remove files not present in source
            "--profile", self.profile,
            "--region", self.region
        ]
        
        self.run_command(cmd)
        self.log("S3 sync completed successfully")
        
    def get_distribution_id(self, domain_name: str) -> str:
        """Get CloudFront distribution ID from domain name."""
        self.log(f"Finding CloudFront distribution ID for domain: {domain_name}")
        
        cmd = [
            "aws", "cloudfront", "list-distributions",
            "--output", "json",
            "--profile", self.profile
        ]
        
        result = self.run_command(cmd, capture_output=True)
        distributions = json.loads(result.stdout)
        
        # Search for distribution with matching domain name
        for dist in distributions.get("DistributionList", {}).get("Items", []):
            if dist.get("DomainName") == domain_name:
                dist_id = dist["Id"]
                self.log(f"Found distribution ID: {dist_id}")
                return dist_id
                
            # Also check alternate domain names
            for alias in dist.get("Aliases", {}).get("Items", []):
                if alias == domain_name:
                    dist_id = dist["Id"]
                    self.log(f"Found distribution ID for custom domain: {dist_id}")
                    return dist_id
                    
        self.log(f"No CloudFront distribution found for domain: {domain_name}", "ERROR")
        sys.exit(1)
        
    def create_invalidation(self, distribution_id: str) -> str:
        """Create CloudFront invalidation for all paths."""
        self.log(f"Creating CloudFront invalidation for distribution: {distribution_id}")
        
        cmd = [
            "aws", "cloudfront", "create-invalidation",
            "--distribution-id", distribution_id,
            "--paths", "/*",
            "--output", "json",
            "--profile", self.profile
        ]
        
        result = self.run_command(cmd, capture_output=True)
        invalidation_data = json.loads(result.stdout)
        
        invalidation_id = invalidation_data["Invalidation"]["Id"]
        self.log(f"Invalidation created: {invalidation_id}")
        
        return invalidation_id
        
    def wait_for_invalidation(self, distribution_id: str, invalidation_id: str) -> None:
        """Wait for CloudFront invalidation to complete."""
        self.log(f"Waiting for invalidation {invalidation_id} to complete...")
        
        max_wait_time = 300  # 5 minutes maximum
        poll_interval = 10   # 10 seconds between polls
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            cmd = [
                "aws", "cloudfront", "get-invalidation",
                "--distribution-id", distribution_id,
                "--id", invalidation_id,
                "--output", "json",
                "--profile", self.profile
            ]
            
            result = self.run_command(cmd, capture_output=True)
            invalidation_data = json.loads(result.stdout)
            
            status = invalidation_data["Invalidation"]["Status"]
            self.log(f"Invalidation status: {status}")
            
            if status == "Completed":
                self.log("Invalidation completed successfully")
                return
                
            time.sleep(poll_interval)
            elapsed_time += poll_interval
            
        self.log(f"Invalidation did not complete within {max_wait_time} seconds", "ERROR")
        sys.exit(1)
        
    def verify_deployment(self, cloudfront_domain: str) -> None:
        """Verify that the deployed site is accessible."""
        self.log(f"Verifying deployment at https://{cloudfront_domain}/")
        
        try:
            import requests
            response = requests.get(f"https://{cloudfront_domain}/", timeout=30)
            if response.status_code == 200:
                self.log("Deployment verification successful - site is accessible")
            else:
                self.log(f"Deployment verification warning - got HTTP {response.status_code}", "WARNING")
        except ImportError:
            self.log("requests module not available - skipping HTTP verification", "WARNING")
        except Exception as e:
            self.log(f"Deployment verification warning - {str(e)}", "WARNING")
            
    def deploy(self) -> None:
        """Execute the complete deployment process."""
        self.log(f"Starting deployment for environment: {self.environment}")
        self.log(f"Using AWS profile: {self.profile}")
        self.log(f"Using AWS region: {self.region}")
        self.log(f"Target CDK stack: {self.stack_name}")
        
        # Step 1: Validate prerequisites
        self.validate_prerequisites()
        
        # Step 2: Get CDK stack outputs
        outputs = self.get_stack_outputs()
        
        # Step 3: Extract deployment information
        bucket_name, cloudfront_domain = self.extract_deployment_info(outputs)
        
        # Step 4: Build frontend
        self.build_frontend()
        
        # Step 5: Sync to S3
        self.sync_to_s3(bucket_name)
        
        # Step 6: Invalidate CloudFront cache
        distribution_id = self.get_distribution_id(cloudfront_domain)
        invalidation_id = self.create_invalidation(distribution_id)
        
        # Step 7: Wait for invalidation to complete
        self.wait_for_invalidation(distribution_id, invalidation_id)
        
        # Step 8: Verify deployment
        self.verify_deployment(cloudfront_domain)
        
        self.log("Deployment completed successfully!")
        self.log(f"Site URL: https://{cloudfront_domain}/")


def main():
    """Main entry point for the deployment script."""
    parser = argparse.ArgumentParser(
        description="Deploy EBS Performance Suite frontend to S3/CloudFront",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --env dev                    # Deploy to dev environment
  %(prog)s --env prod                   # Deploy to prod environment  
  %(prog)s --env dev --profile my-aws   # Use custom AWS profile
  %(prog)s --env dev --region us-east-1 # Use custom AWS region
        """
    )
    
    parser.add_argument(
        "--env",
        type=str,
        required=True,
        choices=["dev", "staging", "prod", "test"],
        help="Target deployment environment"
    )
    
    parser.add_argument(
        "--profile",
        type=str,
        help="AWS profile to use (default: jnicamzn-sso-ec2)"
    )
    
    parser.add_argument(
        "--region",
        type=str,
        help="AWS region to use (default: us-west-2)"
    )
    
    args = parser.parse_args()
    
    # Create deployer and execute deployment
    try:
        deployer = WebDeployer(
            environment=args.env,
            profile=args.profile,
            region=args.region
        )
        deployer.deploy()
    except KeyboardInterrupt:
        print("\nDeployment interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nDeployment failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()