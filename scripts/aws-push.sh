#!/usr/bin/env bash
# Build and push API + Front images to ECR for AWS deployment.
# Run from repo root: ./scripts/aws-push.sh
# Requires: AWS CLI configured, ECR repos stenaskartinami-api and stenaskartinami-front.

set -e

AWS_REGION=${AWS_REGION:-eu-west-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_API=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-api
ECR_FRONT=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/stenaskartinami-front

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "Building and pushing API..."
docker build -t $ECR_API:latest ./api-v5
docker push $ECR_API:latest

echo "Building and pushing Front..."
docker build -t $ECR_FRONT:latest ./front
docker push $ECR_FRONT:latest

echo "Done. Pushed stenaskartinami-api and stenaskartinami-front to ECR."
