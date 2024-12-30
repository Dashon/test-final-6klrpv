#!/usr/bin/env bash

# AI-Enhanced Social Travel Platform - Backup Script
# Version: 1.0.0
# AWS CLI Version: 2.x
# PostgreSQL Client Version: 15.x
# Kubernetes CLI Version: 1.26.x

set -euo pipefail

# Global Configuration
BACKUP_ROOT="/mnt/backups"
S3_BUCKET_PREFIX="${PROJECT_NAME:-ai-travel-platform}-${ENVIRONMENT:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_ROOT}/logs/backup_${TIMESTAMP}.log"

# Retention periods in days
declare -A RETENTION_DAYS=(
    ["database"]="7"
    ["ml_models"]="30"
    ["config"]="90"
)

# Compression levels (1-9, higher = better compression but slower)
declare -A COMPRESSION_LEVELS=(
    ["database"]="9"
    ["ml_models"]="6"
    ["config"]="4"
)

# Initialize logging
setup_logging() {
    mkdir -p "${BACKUP_ROOT}/logs"
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process started"
}

# Validate environment and prerequisites
validate_environment() {
    local required_commands=("aws" "kubectl" "pg_dump" "pg_restore" "tar" "gzip")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            echo "Error: Required command '$cmd' not found"
            exit 1
        fi
    done

    # Verify AWS credentials
    aws sts get-caller-identity >/dev/null || {
        echo "Error: Invalid AWS credentials"
        exit 1
    }
}

# Database backup function
backup_database() {
    local db_name="$1"
    local output_path="$2"
    local compression_level="${3:-9}"
    local parallel_jobs="${4:-4}"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of database: ${db_name}"
    
    # Get database credentials from Kubernetes secrets
    local db_host=$(kubectl get secret -n ai-travel-platform postgresql-credentials -o jsonpath='{.data.host}' | base64 -d)
    local db_port=$(kubectl get secret -n ai-travel-platform postgresql-credentials -o jsonpath='{.data.port}' | base64 -d)
    local db_user=$(kubectl get secret -n ai-travel-platform postgresql-credentials -o jsonpath='{.data.username}' | base64 -d)
    local db_password=$(kubectl get secret -n ai-travel-platform postgresql-credentials -o jsonpath='{.data.password}' | base64 -d)
    
    # Create backup with parallel processing
    PGPASSWORD="${db_password}" pg_dump \
        -h "${db_host}" \
        -p "${db_port}" \
        -U "${db_user}" \
        -d "${db_name}" \
        -F custom \
        -j "${parallel_jobs}" \
        -Z "${compression_level}" \
        -f "${output_path}"
    
    # Generate checksum
    sha256sum "${output_path}" > "${output_path}.sha256"
    
    # Upload to S3 with server-side encryption
    aws s3 cp "${output_path}" \
        "s3://${S3_BUCKET_PREFIX}-backups/database/${db_name}/${TIMESTAMP}/" \
        --sse aws:kms \
        --metadata "retention=${RETENTION_DAYS[database]}"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database backup completed: ${db_name}"
}

# ML models backup function
backup_ml_models() {
    local model_path="$1"
    local version_tag="$2"
    local differential="${3:-false}"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting ML models backup: ${version_tag}"
    
    local backup_path="${BACKUP_ROOT}/ml_models/${version_tag}_${TIMESTAMP}.tar.gz"
    local manifest_path="${backup_path}.manifest"
    
    # Create versioned backup
    if [[ "${differential}" == "true" ]]; then
        # Find last full backup for differential
        local last_full=$(aws s3 ls "s3://${S3_BUCKET_PREFIX}-backups/ml_models/" \
            | sort | tail -n 1 | awk '{print $4}')
        
        tar czf "${backup_path}" \
            --newer-mtime="${last_full}" \
            --level=1 \
            -C "${model_path}" .
    else
        tar czf "${backup_path}" \
            -C "${model_path}" .
    fi
    
    # Generate manifest with metadata
    cat > "${manifest_path}" <<EOF
version: ${version_tag}
timestamp: ${TIMESTAMP}
differential: ${differential}
checksum: $(sha256sum "${backup_path}" | cut -d' ' -f1)
size: $(stat -f %z "${backup_path}")
EOF
    
    # Upload to S3 with versioning
    aws s3 cp "${backup_path}" \
        "s3://${S3_BUCKET_PREFIX}-backups/ml_models/${version_tag}/" \
        --sse aws:kms \
        --metadata "retention=${RETENTION_DAYS[ml_models]}"
    
    aws s3 cp "${manifest_path}" \
        "s3://${S3_BUCKET_PREFIX}-backups/ml_models/${version_tag}/" \
        --sse aws:kms
        
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ML models backup completed: ${version_tag}"
}

# Configuration backup function
backup_config() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting configuration backup"
    
    local config_path="${BACKUP_ROOT}/config/${TIMESTAMP}"
    mkdir -p "${config_path}"
    
    # Backup Kubernetes configurations
    kubectl get all -n ai-travel-platform -o yaml > "${config_path}/k8s_resources.yaml"
    kubectl get secrets -n ai-travel-platform -o yaml > "${config_path}/k8s_secrets.yaml"
    kubectl get configmaps -n ai-travel-platform -o yaml > "${config_path}/k8s_configmaps.yaml"
    
    # Compress configurations
    tar czf "${config_path}.tar.gz" -C "${config_path}" . \
        --compress-level="${COMPRESSION_LEVELS[config]}"
    
    # Upload to S3
    aws s3 cp "${config_path}.tar.gz" \
        "s3://${S3_BUCKET_PREFIX}-backups/config/${TIMESTAMP}/" \
        --sse aws:kms \
        --metadata "retention=${RETENTION_DAYS[config]}"
        
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configuration backup completed"
}

# Cleanup old backups
cleanup_old_backups() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup cleanup"
    
    for type in "${!RETENTION_DAYS[@]}"; do
        aws s3 ls "s3://${S3_BUCKET_PREFIX}-backups/${type}/" \
            | while read -r line; do
                backup_date=$(echo "$line" | awk '{print $1}')
                retention_days="${RETENTION_DAYS[$type]}"
                
                if [[ $(date -d "${backup_date}" +%s) -lt $(date -d "-${retention_days} days" +%s) ]]; then
                    aws s3 rm "s3://${S3_BUCKET_PREFIX}-backups/${type}/${backup_date}/" --recursive
                fi
            done
    done
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup cleanup completed"
}

# Main execution
main() {
    setup_logging
    validate_environment
    
    # Create backup directory structure
    mkdir -p "${BACKUP_ROOT}"/{database,ml_models,config,logs}
    
    # Execute backups
    backup_database "ai_travel_platform" "${BACKUP_ROOT}/database/postgres_${TIMESTAMP}.backup"
    backup_ml_models "/mnt/ml_models" "production" false
    backup_config
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate backup report
    cat > "${BACKUP_ROOT}/logs/backup_report_${TIMESTAMP}.json" <<EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "success": true,
    "details": {
        "database_size": "$(stat -f %z "${BACKUP_ROOT}/database/postgres_${TIMESTAMP}.backup")",
        "ml_models_size": "$(stat -f %z "${BACKUP_ROOT}/ml_models/production_${TIMESTAMP}.tar.gz")",
        "config_size": "$(stat -f %z "${BACKUP_ROOT}/config/${TIMESTAMP}.tar.gz")"
    },
    "metrics": {
        "duration_seconds": "$SECONDS",
        "backup_count": 3
    }
}
EOF
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process completed successfully"
}

# Execute main function
main "$@"