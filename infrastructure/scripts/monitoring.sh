#!/bin/bash
set -euo pipefail

# Monitoring Stack Deployment Script
# Version: 1.0.0
# Dependencies:
# - kubectl v1.26.x
# - helm v3.12.x
# - AWS CLI v2.x

# Global Variables
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="9.5.x"
ELASTICSEARCH_VERSION="8.7.x"
SECURITY_CONTEXT="restricted"
HA_ENABLED="true"
ENCRYPTION_ENABLED="true"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message=$@
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}"
}

# Error handling
error_handler() {
    local line_number=$1
    local error_code=$2
    log "ERROR" "Failed at line ${line_number} with error code ${error_code}"
    cleanup_on_failure
    exit 1
}

trap 'error_handler ${LINENO} $?' ERR

# Validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating prerequisites..."
    
    # Check required tools
    for tool in kubectl helm aws; do
        if ! command -v $tool &> /dev/null; then
            log "ERROR" "${tool} is required but not installed"
            exit 1
        fi
    done

    # Validate Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "Invalid AWS credentials"
        exit 1
    }
}

# Create monitoring namespace with security policies
create_namespace() {
    log "INFO" "Creating monitoring namespace with security policies..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: ${MONITORING_NAMESPACE}
  labels:
    name: monitoring
    security: restricted
EOF

    # Apply pod security policy
    cat <<EOF | kubectl apply -f -
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: monitoring-psp
  namespace: ${MONITORING_NAMESPACE}
spec:
  privileged: false
  seLinux:
    rule: RunAsAny
  runAsUser:
    rule: MustRunAsNonRoot
  fsGroup:
    rule: MustRunAs
    ranges:
    - min: 1000
      max: 65535
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'persistentVolumeClaim'
    - 'secret'
EOF
}

# Deploy Prometheus with security enhancements
deploy_prometheus() {
    log "INFO" "Deploying Prometheus ${PROMETHEUS_VERSION}..."
    
    # Create service account and RBAC
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: ${MONITORING_NAMESPACE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
  - apiGroups: [""]
    resources: ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch"]
EOF

    # Deploy Prometheus with configuration
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace ${MONITORING_NAMESPACE} \
        --version ${PROMETHEUS_VERSION} \
        --values ../monitoring/prometheus/prometheus.yaml \
        --set securityContext.runAsNonRoot=true \
        --set securityContext.runAsUser=65534 \
        --set server.persistentVolume.enabled=true \
        --set server.persistentVolume.size=50Gi \
        --set alertmanager.persistentVolume.enabled=true \
        --wait

    log "SUCCESS" "Prometheus deployment completed"
}

# Deploy Grafana with OAuth and security features
deploy_grafana() {
    log "INFO" "Deploying Grafana ${GRAFANA_VERSION}..."
    
    # Create TLS secret for Grafana
    kubectl create secret tls grafana-tls \
        --namespace ${MONITORING_NAMESPACE} \
        --cert=../certs/grafana.crt \
        --key=../certs/grafana.key \
        --dry-run=client -o yaml | kubectl apply -f -

    # Deploy Grafana with configuration
    helm upgrade --install grafana grafana/grafana \
        --namespace ${MONITORING_NAMESPACE} \
        --version ${GRAFANA_VERSION} \
        --values ../monitoring/grafana/values.yaml \
        --wait

    log "SUCCESS" "Grafana deployment completed"
}

# Deploy Elasticsearch with security hardening
deploy_elasticsearch() {
    log "INFO" "Deploying Elasticsearch ${ELASTICSEARCH_VERSION}..."
    
    # Apply Elasticsearch configuration
    kubectl apply -f ../monitoring/elasticsearch/elasticsearch.yaml

    # Wait for deployment
    kubectl rollout status statefulset/elasticsearch \
        --namespace ${MONITORING_NAMESPACE} \
        --timeout=600s

    log "SUCCESS" "Elasticsearch deployment completed"
}

# Check monitoring stack health
check_monitoring_health() {
    log "INFO" "Checking monitoring stack health..."
    
    local components=("prometheus" "grafana" "elasticsearch")
    local healthy=true

    for component in "${components[@]}"; do
        if ! kubectl get pods -n ${MONITORING_NAMESPACE} -l app=${component} \
            -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | grep -q "true"; then
            log "ERROR" "${component} is not healthy"
            healthy=false
        fi
    done

    if [ "$healthy" = true ]; then
        log "SUCCESS" "All monitoring components are healthy"
    else
        log "ERROR" "Some monitoring components are unhealthy"
        return 1
    fi
}

# Configure monitoring stack backup
configure_backups() {
    log "INFO" "Configuring monitoring stack backups..."
    
    # Create backup storage class
    kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: monitoring-backup
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
EOF

    # Configure Velero backup schedule
    kubectl apply -f - <<EOF
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: monitoring-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    includedNamespaces:
    - ${MONITORING_NAMESPACE}
    storageLocation: default
    volumeSnapshotLocations:
    - default
EOF
}

# Main deployment function
deploy_monitoring_stack() {
    log "INFO" "Starting monitoring stack deployment..."
    
    validate_prerequisites
    create_namespace
    deploy_prometheus
    deploy_grafana
    deploy_elasticsearch
    configure_backups
    check_monitoring_health
    
    log "SUCCESS" "Monitoring stack deployment completed successfully"
}

# Cleanup function for failure cases
cleanup_on_failure() {
    log "INFO" "Cleaning up failed deployment..."
    
    components=("prometheus" "grafana" "elasticsearch")
    for component in "${components[@]}"; do
        kubectl delete deployment,statefulset,service,configmap,secret \
            -l app=${component} -n ${MONITORING_NAMESPACE} --ignore-not-found
    done
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    deploy_monitoring_stack
fi

# Export monitoring status function for external use
get_monitoring_status() {
    check_monitoring_health
}

# Export security status function for external use
get_security_status() {
    log "INFO" "Checking security compliance..."
    
    # Verify TLS certificates
    kubectl get secret grafana-tls -n ${MONITORING_NAMESPACE} &> /dev/null || \
        { log "ERROR" "Grafana TLS certificate missing"; return 1; }
    
    # Check security contexts
    kubectl get pods -n ${MONITORING_NAMESPACE} -o json | \
        jq -r '.items[].spec.securityContext.runAsNonRoot' | \
        grep -q "true" || { log "ERROR" "Non-root security context not enforced"; return 1; }
    
    log "SUCCESS" "Security compliance verified"
    return 0
}