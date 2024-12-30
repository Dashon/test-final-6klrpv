# Core Configuration Variables
variable "environment" {
  type        = string
  description = "Deployment environment identifier (development, staging, production)"
  
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "identifier" {
  type        = string
  description = "Unique identifier for the RDS instance"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class determining compute and memory capacity"
  default     = "db.r6g.xlarge"
}

# Database Configuration
variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "15.3"
  
  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.engine_version))
    error_message = "Engine version must be in format XX.X"
  }
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 100
  
  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 GB and 65536 GB"
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage size in GB for autoscaling"
  default     = 1000
  
  validation {
    condition     = var.max_allocated_storage >= 100
    error_message = "Maximum allocated storage must be at least 100 GB"
  }
}

# High Availability Configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 35
  
  validation {
    condition     = var.backup_retention_period >= 0 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days"
  }
}

variable "backup_window" {
  type        = string
  description = "Daily time range during which automated backups are created"
  default     = "03:00-04:00"
  
  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range during which system maintenance can occur"
  default     = "Mon:04:00-Mon:05:00"
  
  validation {
    condition     = can(regex("^[A-Za-z]{3}:[0-9]{2}:[0-9]{2}-[A-Za-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in format DDD:HH:MM-DDD:HH:MM"
  }
}

# Security Configuration
variable "storage_encrypted" {
  type        = bool
  description = "Enable storage encryption using AWS KMS"
  default     = true
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for RDS encryption"
  sensitive   = true
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot when destroying instance"
  default     = false
}

# Performance and Monitoring
variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 30
  
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights"
  default     = true
}

variable "performance_insights_retention_period" {
  type        = number
  description = "Performance Insights retention period in days"
  default     = 7
  
  validation {
    condition     = contains([7, 731], var.performance_insights_retention_period)
    error_message = "Performance Insights retention period must be either 7 or 731 days"
  }
}

# Network Configuration
variable "port" {
  type        = number
  description = "Database port number"
  default     = 5432
  
  validation {
    condition     = var.port >= 1150 && var.port <= 65535
    error_message = "Port must be between 1150 and 65535"
  }
}

variable "parameter_group_family" {
  type        = string
  description = "Database parameter group family"
  default     = "postgres15"
}

# Monitoring and Logging
variable "enabled_cloudwatch_logs_exports" {
  type        = list(string)
  description = "List of log types to export to CloudWatch"
  default     = ["postgresql", "upgrade"]
  
  validation {
    condition     = alltrue([for log in var.enabled_cloudwatch_logs_exports : contains(["postgresql", "upgrade"], log)])
    error_message = "Valid log types are: postgresql, upgrade"
  }
}

variable "enhanced_monitoring_role_arn" {
  type        = string
  description = "IAM role ARN for enhanced monitoring"
}

# Tags
variable "tags" {
  type        = map(string)
  description = "Additional tags for RDS resources"
  default     = {}
}