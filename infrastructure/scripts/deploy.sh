#!/usr/bin/env bash

# AI-Enhanced Social Travel Platform Deployment Script
# Version: 1.0.0
# Description: Automated deployment script for managing infrastructure and application deployment
# across development, staging, and production environments.

set -euo pipefail
IFS=$'\n\t'

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
readonly KUBERNETES_DIR="${SCRIPT_DIR}/../kubernetes"
readonly LOG_FILE="/var/log/platform-deploy-$(date +%Y%m%d-%H%M%S).log"

# Environment configurations
declare -A AWS_REGIONS=(
    ["development"]="us-east-1"
    ["staging"]="us-east-2"
    ["production"]="us-east-1 us-west-2 eu-west-1"
)

declare -A DEPLOYMENT_STRATEGIES=(
    ["development"]="RollingUpdate"
    ["staging"]="BlueGreen"
    ["production"]="Canary"
)

# Health check endpoints
declare -A HEALTH_CHECK_ENDPOINTS=(
    ["api"]="/health"
    ["auth"]="/auth/health"
    ["booking"]="/booking/health"
    ["chat"]="/chat/health"
)

# Rollback thresholds
readonly ERROR_RATE_THRESHOLD=0.05
readonly LATENCY_THRESHOLD_MS=500
readonly AVAILABILITY_THRESHOLD=0.995

# Logging configuration
setup_logging() {
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    echo "Deployment started at $(date '+%Y-%m-%d %H:%M:%S')"
}

# Log messages with timestamp
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*"
}

# Check prerequisites for deployment
check_prerequisites() {
    local environment=$1
    log "INFO" "Checking prerequisites for ${environment} deployment"

    # Check required tools
    local required_tools=("terraform" "kubectl" "aws" "jq" "yq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &> /dev/null; then
            log "ERROR" "${tool} is required but not installed"
            return 1
        fi
    done

    # Verify tool versions
    if ! terraform version | grep -q "v1.4"; then
        log "ERROR" "Terraform 1.4.x is required"
        return 1
    fi

    if ! kubectl version --client | grep -q "v1.26"; then
        log "ERROR" "kubectl v1.26.x is required"
        return 1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "Invalid AWS credentials"
        return 1
    }

    # Check environment-specific configurations
    if [[ ! -d "${TERRAFORM_DIR}/environments/${environment}" ]]; then
        log "ERROR" "Missing Terraform configuration for ${environment}"
        return 1
    }

    log "INFO" "Prerequisites check passed"
    return 0
}

# Deploy infrastructure using Terraform
deploy_infrastructure() {
    local environment=$1
    local region=$2
    log "INFO" "Deploying infrastructure for ${environment} in ${region}"

    cd "${TERRAFORM_DIR}/environments/${environment}"

    # Initialize Terraform
    log "INFO" "Initializing Terraform"
    terraform init -backend-config="region=${region}" || return 1

    # Select workspace
    terraform workspace select "${environment}" || terraform workspace new "${environment}"

    # Plan deployment
    log "INFO" "Planning Terraform changes"
    terraform plan -out=tfplan || return 1

    # Apply changes
    log "INFO" "Applying Terraform changes"
    if [[ "${environment}" == "production" ]]; then
        log "WARN" "Production deployment requires approval"
        read -p "Do you want to proceed with production deployment? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Production deployment cancelled"
            return 1
        fi
    fi

    terraform apply tfplan || return 1
    log "INFO" "Infrastructure deployment completed"
}

# Deploy applications using Kubernetes
deploy_applications() {
    local environment=$1
    local strategy=${DEPLOYMENT_STRATEGIES[${environment}]}
    log "INFO" "Deploying applications for ${environment} using ${strategy} strategy"

    # Apply Kubernetes configurations
    kubectl apply -k "${KUBERNETES_DIR}/overlays/${environment}" || return 1

    case "${strategy}" in
        "BlueGreen")
            deploy_blue_green "${environment}"
            ;;
        "Canary")
            deploy_canary "${environment}"
            ;;
        *)
            deploy_rolling_update "${environment}"
            ;;
    esac
}

# Blue-Green deployment strategy
deploy_blue_green() {
    local environment=$1
    log "INFO" "Executing Blue-Green deployment for ${environment}"

    # Create new (green) deployment
    kubectl apply -f "${KUBERNETES_DIR}/overlays/${environment}/green-deployment.yaml"

    # Wait for green deployment to be ready
    kubectl rollout status deployment/green-deployment -n "${environment}"

    # Switch traffic to green deployment
    kubectl patch service main-service -n "${environment}" -p '{"spec":{"selector":{"deployment":"green"}}}'

    # Remove old (blue) deployment
    kubectl delete -f "${KUBERNETES_DIR}/overlays/${environment}/blue-deployment.yaml"
}

# Canary deployment strategy
deploy_canary() {
    local environment=$1
    log "INFO" "Executing Canary deployment for ${environment}"

    # Deploy canary with 10% traffic
    kubectl apply -f "${KUBERNETES_DIR}/overlays/${environment}/canary-deployment.yaml"
    
    # Monitor canary health
    for i in {1..5}; do
        if ! check_canary_health "${environment}"; then
            log "ERROR" "Canary deployment failed health check"
            rollback "${environment}"
            return 1
        fi
        log "INFO" "Canary health check passed: ${i}/5"
        sleep 60
    done

    # Gradually increase traffic to 100%
    local traffic_splits=(25 50 75 100)
    for split in "${traffic_splits[@]}"; do
        kubectl patch service main-service -n "${environment}" \
            -p "{\"spec\":{\"trafficPolicy\":{\"weight\":${split}}}}"
        sleep 300
        
        if ! check_canary_health "${environment}"; then
            log "ERROR" "Canary deployment failed at ${split}% traffic"
            rollback "${environment}"
            return 1
        fi
    done
}

# Rolling update deployment strategy
deploy_rolling_update() {
    local environment=$1
    log "INFO" "Executing Rolling Update deployment for ${environment}"

    kubectl apply -f "${KUBERNETES_DIR}/overlays/${environment}/deployment.yaml"
    kubectl rollout status deployment/main-deployment -n "${environment}"
}

# Perform health checks
health_check() {
    local environment=$1
    log "INFO" "Performing health checks for ${environment}"

    local failed_checks=0
    for service in "${!HEALTH_CHECK_ENDPOINTS[@]}"; do
        local endpoint="${HEALTH_CHECK_ENDPOINTS[${service}]}"
        log "INFO" "Checking health of ${service} at ${endpoint}"
        
        if ! curl -sf "https://${environment}.api.ai-travel-platform.com${endpoint}" > /dev/null; then
            log "ERROR" "Health check failed for ${service}"
            ((failed_checks++))
        fi
    done

    return "${failed_checks}"
}

# Rollback deployment
rollback() {
    local environment=$1
    local deployment_id=$2
    log "WARN" "Initiating rollback for ${environment} deployment ${deployment_id}"

    # Revert Kubernetes deployments
    kubectl rollout undo deployment/main-deployment -n "${environment}"

    # Revert Terraform changes if necessary
    if [[ -f "${TERRAFORM_DIR}/environments/${environment}/terraform.tfstate.backup" ]]; then
        cd "${TERRAFORM_DIR}/environments/${environment}"
        terraform state push terraform.tfstate.backup
    fi

    log "INFO" "Rollback completed"
}

# Main deployment function
deploy() {
    local environment=$1
    local deployment_id="deploy-$(date +%Y%m%d-%H%M%S)"
    
    setup_logging
    log "INFO" "Starting deployment ${deployment_id} for ${environment}"

    # Check prerequisites
    if ! check_prerequisites "${environment}"; then
        log "ERROR" "Prerequisites check failed"
        return 1
    fi

    # Deploy to each region for production
    if [[ "${environment}" == "production" ]]; then
        for region in ${AWS_REGIONS[${environment}]}; do
            if ! deploy_infrastructure "${environment}" "${region}"; then
                log "ERROR" "Infrastructure deployment failed in ${region}"
                rollback "${environment}" "${deployment_id}"
                return 1
            fi
        done
    else
        if ! deploy_infrastructure "${environment}" "${AWS_REGIONS[${environment}]}"; then
            log "ERROR" "Infrastructure deployment failed"
            rollback "${environment}" "${deployment_id}"
            return 1
        fi
    fi

    # Deploy applications
    if ! deploy_applications "${environment}"; then
        log "ERROR" "Application deployment failed"
        rollback "${environment}" "${deployment_id}"
        return 1
    fi

    # Perform health checks
    if ! health_check "${environment}"; then
        log "ERROR" "Health checks failed"
        rollback "${environment}" "${deployment_id}"
        return 1
    fi

    log "INFO" "Deployment ${deployment_id} completed successfully"
    return 0
}

# Script entry point
main() {
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 <environment> [--rollback <deployment-id>]"
        exit 1
    fi

    local environment=$1
    shift

    if [[ ! "${AWS_REGIONS[${environment}]+isset}" ]]; then
        echo "Invalid environment. Must be one of: ${!AWS_REGIONS[@]}"
        exit 1
    fi

    if [[ $# -gt 0 && $1 == "--rollback" ]]; then
        if [[ $# -lt 2 ]]; then
            echo "Deployment ID required for rollback"
            exit 1
        fi
        rollback "${environment}" "$2"
    else
        deploy "${environment}"
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

This deployment script provides a comprehensive solution for deploying the AI-Enhanced Social Travel Platform across different environments. Key features include:

1. Environment-specific deployment strategies (Rolling Update, Blue-Green, Canary)
2. Multi-region support for production deployments
3. Comprehensive health checks and monitoring
4. Automated rollback capabilities
5. Detailed logging and error handling
6. Security validations and prerequisite checks
7. Infrastructure deployment using Terraform
8. Application deployment using Kubernetes
9. Support for different deployment strategies based on environment

The script follows best practices for shell scripting, including:
- Strict error handling with `set -euo pipefail`
- Comprehensive logging
- Modular function design
- Input validation
- Secure variable handling
- Clear documentation and comments

Usage examples:
```bash
# Deploy to development
./deploy.sh development

# Deploy to production
./deploy.sh production

# Rollback a specific deployment
./deploy.sh production --rollback deploy-20240120-123456