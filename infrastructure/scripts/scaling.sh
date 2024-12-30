#!/usr/bin/env bash

# Version: 1.0.0
# AI Travel Platform - Kubernetes Scaling Script
# Dependencies:
# - kubectl v1.26.x
# - jq 1.6

set -euo pipefail

# Global Configuration
readonly NAMESPACE="ai-travel-platform"
readonly DEFAULT_CPU_THRESHOLD=70
readonly DEFAULT_MIN_REPLICAS=3
readonly DEFAULT_MAX_REPLICAS=10
readonly SCALING_TIMEOUT=300
readonly RESOURCE_ADJUSTMENT_INTERVAL=30
readonly GPU_QUOTA_LIMIT=8
readonly LOG_LEVEL="INFO"

# Logging Configuration
declare -A LOG_LEVELS=([DEBUG]=0 [INFO]=1 [WARN]=2 [ERROR]=3)

log() {
    local level=$1
    shift
    if [[ ${LOG_LEVELS[$level]} -ge ${LOG_LEVELS[$LOG_LEVEL]} ]]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*" >&2
    fi
}

# Validation Functions
validate_deployment() {
    local deployment_name=$1
    local namespace=$2

    if ! kubectl get deployment "$deployment_name" -n "$namespace" &>/dev/null; then
        log "ERROR" "Deployment $deployment_name not found in namespace $namespace"
        return 1
    fi
}

validate_gpu_quota() {
    local deployment_name=$1
    local requested_gpus=$2
    
    local current_gpus
    current_gpus=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o json | \
                  jq '.spec.template.spec.containers[].resources.requests."nvidia.com/gpu"' || echo "0")
    
    if [[ $((current_gpus + requested_gpus)) -gt $GPU_QUOTA_LIMIT ]]; then
        log "ERROR" "GPU quota exceeded. Limit: $GPU_QUOTA_LIMIT, Requested: $requested_gpus, Current: $current_gpus"
        return 1
    fi
}

# Backup Functions
create_deployment_backup() {
    local deployment_name=$1
    local backup_file="/tmp/${deployment_name}_backup_$(date +%Y%m%d_%H%M%S).yaml"
    
    kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o yaml > "$backup_file"
    log "INFO" "Deployment backup created at $backup_file"
    echo "$backup_file"
}

restore_deployment() {
    local backup_file=$1
    
    if [[ -f "$backup_file" ]]; then
        kubectl apply -f "$backup_file"
        log "INFO" "Deployment restored from backup $backup_file"
    else
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
}

# Main Scaling Functions
scale_deployment() {
    local deployment_name=$1
    local replica_count=$2
    local service_config=$3
    local backup_file
    
    log "INFO" "Scaling deployment $deployment_name to $replica_count replicas"
    
    # Validate deployment
    validate_deployment "$deployment_name" "$NAMESPACE" || return 1
    
    # Service-specific validations
    case "$deployment_name" in
        "ml-service")
            validate_gpu_quota "$deployment_name" "$replica_count" || return 1
            ;;
        "api-gateway")
            # Ensure minimum replicas for high availability
            if [[ $replica_count -lt 3 ]]; then
                log "ERROR" "API Gateway requires minimum 3 replicas for HA"
                return 1
            fi
            ;;
    esac
    
    # Create backup
    backup_file=$(create_deployment_backup "$deployment_name")
    
    # Apply scaling
    if ! kubectl scale deployment "$deployment_name" -n "$NAMESPACE" --replicas="$replica_count"; then
        log "ERROR" "Failed to scale deployment $deployment_name"
        restore_deployment "$backup_file"
        return 1
    fi
    
    # Wait for rollout
    if ! kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout="${SCALING_TIMEOUT}s"; then
        log "ERROR" "Rollout timeout for deployment $deployment_name"
        restore_deployment "$backup_file"
        return 1
    fi
    
    log "INFO" "Successfully scaled deployment $deployment_name to $replica_count replicas"
    return 0
}

adjust_resource_limits() {
    local deployment_name=$1
    local cpu_limit=$2
    local memory_limit=$3
    local gpu_config=$4
    
    log "INFO" "Adjusting resources for deployment $deployment_name"
    
    # Create resource patch
    local patch
    patch=$(cat <<EOF
{
    "spec": {
        "template": {
            "spec": {
                "containers": [{
                    "name": "$deployment_name",
                    "resources": {
                        "limits": {
                            "cpu": "$cpu_limit",
                            "memory": "$memory_limit"
                        }
                    }
                }]
            }
        }
    }
}
EOF
)
    
    # Add GPU configuration if specified
    if [[ -n "$gpu_config" ]]; then
        patch=$(echo "$patch" | jq --arg gpu "$gpu_config" \
               '.spec.template.spec.containers[0].resources.limits."nvidia.com/gpu"=$gpu')
    fi
    
    # Apply patch
    if ! kubectl patch deployment "$deployment_name" -n "$NAMESPACE" --patch "$patch"; then
        log "ERROR" "Failed to adjust resources for deployment $deployment_name"
        return 1
    fi
    
    log "INFO" "Successfully adjusted resources for deployment $deployment_name"
    return 0
}

configure_hpa() {
    local deployment_name=$1
    local min_replicas=$2
    local max_replicas=$3
    local cpu_threshold=${4:-$DEFAULT_CPU_THRESHOLD}
    
    log "INFO" "Configuring HPA for deployment $deployment_name"
    
    # Service-specific HPA configurations
    local metrics_config
    case "$deployment_name" in
        "ml-service")
            metrics_config=$(cat <<EOF
{
    "metrics": [
        {
            "type": "Resource",
            "resource": {
                "name": "cpu",
                "target": {
                    "type": "Utilization",
                    "averageUtilization": $cpu_threshold
                }
            }
        },
        {
            "type": "Resource",
            "resource": {
                "name": "memory",
                "target": {
                    "type": "Utilization",
                    "averageUtilization": 80
                }
            }
        }
    ]
}
EOF
)
            ;;
        "api-gateway")
            metrics_config=$(cat <<EOF
{
    "metrics": [
        {
            "type": "Resource",
            "resource": {
                "name": "cpu",
                "target": {
                    "type": "Utilization",
                    "averageUtilization": $cpu_threshold
                }
            }
        },
        {
            "type": "Pods",
            "pods": {
                "metric": {
                    "name": "http_requests_per_second"
                },
                "target": {
                    "type": "AverageValue",
                    "averageValue": "1k"
                }
            }
        }
    ]
}
EOF
)
            ;;
        *)
            metrics_config=$(cat <<EOF
{
    "metrics": [
        {
            "type": "Resource",
            "resource": {
                "name": "cpu",
                "target": {
                    "type": "Utilization",
                    "averageUtilization": $cpu_threshold
                }
            }
        }
    ]
}
EOF
)
            ;;
    esac
    
    # Create or update HPA
    local hpa_config
    hpa_config=$(cat <<EOF
{
    "apiVersion": "autoscaling/v2",
    "kind": "HorizontalPodAutoscaler",
    "metadata": {
        "name": "$deployment_name-hpa",
        "namespace": "$NAMESPACE"
    },
    "spec": {
        "scaleTargetRef": {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "name": "$deployment_name"
        },
        "minReplicas": $min_replicas,
        "maxReplicas": $max_replicas,
        "behavior": {
            "scaleDown": {
                "stabilizationWindowSeconds": 300,
                "policies": [
                    {
                        "type": "Pods",
                        "value": 1,
                        "periodSeconds": 60
                    }
                ]
            },
            "scaleUp": {
                "stabilizationWindowSeconds": 60,
                "policies": [
                    {
                        "type": "Pods",
                        "value": 2,
                        "periodSeconds": 60
                    }
                ]
            }
        }
    }
}
EOF
)
    
    # Merge metrics configuration
    hpa_config=$(echo "$hpa_config" | jq --argjson metrics "$metrics_config" '.spec += $metrics')
    
    # Apply HPA configuration
    echo "$hpa_config" | kubectl apply -f -
    
    log "INFO" "Successfully configured HPA for deployment $deployment_name"
    return 0
}

# Usage Examples
# scale_deployment "api-gateway" 5 "{}"
# adjust_resource_limits "ml-service" "2000m" "4Gi" "1"
# configure_hpa "booking-service" 3 10 70