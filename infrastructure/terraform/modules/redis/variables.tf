# Core Redis Cluster Configuration
variable "cluster_id" {
  type        = string
  description = "Unique identifier for the Redis cluster used in resource naming and tagging"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.cluster_id))
    error_message = "Cluster ID must contain only alphanumeric characters and hyphens"
  }
}

variable "node_type" {
  type        = string
  description = "The compute and memory capacity of the nodes (e.g., cache.r6g.large for production workloads)"
  default     = "cache.r6g.large"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.node_type))
    error_message = "Node type must be a valid ElastiCache instance type"
  }
}

variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes for high availability (minimum 3 for 99.9% uptime)"
  default     = 3

  validation {
    condition     = var.num_cache_nodes >= 3
    error_message = "Minimum 3 nodes required for high availability as per SLA requirements"
  }
}

# Cluster Mode and Sharding Configuration
variable "cluster_mode_enabled" {
  type        = bool
  description = "Enable Redis cluster mode for better scalability and data partitioning"
  default     = true
}

variable "num_node_groups" {
  type        = number
  description = "Number of node groups (shards) for cluster mode enabled configurations"
  default     = 3

  validation {
    condition     = var.num_node_groups >= 2
    error_message = "Minimum 2 node groups required for cluster mode"
  }
}

variable "replicas_per_node_group" {
  type        = number
  description = "Number of replica nodes in each node group for high availability"
  default     = 2

  validation {
    condition     = var.replicas_per_node_group >= 1
    error_message = "At least 1 replica per node group required for high availability"
  }
}

# Security Configuration
variable "auth_token" {
  type        = string
  description = "Authentication token for Redis AUTH (must be at least 16 characters)"
  sensitive   = true

  validation {
    condition     = length(var.auth_token) >= 16
    error_message = "Auth token must be at least 16 characters long for security compliance"
  }
}

variable "transit_encryption_enabled" {
  type        = bool
  description = "Enable TLS for data in transit encryption"
  default     = true
}

variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Enable encryption at rest for data security"
  default     = true
}

# Performance and Maintenance Configuration
variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family version (e.g., redis7)"
  default     = "redis7.x"

  validation {
    condition     = can(regex("^redis[0-9]+\\.x$", var.parameter_group_family))
    error_message = "Parameter group family must be a valid Redis version (e.g., redis7.x)"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance operations (UTC)"
  default     = "sun:05:00-sun:07:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM"
  }
}

# Monitoring and Alerting
variable "enhanced_monitoring_enabled" {
  type        = bool
  description = "Enable enhanced monitoring metrics for better observability"
  default     = true
}

variable "alarm_cpu_threshold" {
  type        = number
  description = "CPU utilization threshold percentage for CloudWatch alarms"
  default     = 75

  validation {
    condition     = var.alarm_cpu_threshold > 0 && var.alarm_cpu_threshold <= 100
    error_message = "CPU threshold must be between 1 and 100"
  }
}

variable "alarm_memory_threshold" {
  type        = number
  description = "Memory usage threshold percentage for CloudWatch alarms"
  default     = 80

  validation {
    condition     = var.alarm_memory_threshold > 0 && var.alarm_memory_threshold <= 100
    error_message = "Memory threshold must be between 1 and 100"
  }
}

# Network Configuration
variable "subnet_ids" {
  type        = list(string)
  description = "List of VPC subnet IDs for Redis cluster deployment"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs required for high availability"
  }
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs to associate with the Redis cluster"
  default     = []
}

# Backup Configuration
variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain automatic snapshots"
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

variable "snapshot_window" {
  type        = string
  description = "Daily time range when automated snapshots are created (UTC)"
  default     = "03:00-05:00"

  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.snapshot_window))
    error_message = "Snapshot window must be in the format HH:MM-HH:MM"
  }
}

# Tags
variable "tags" {
  type        = map(string)
  description = "Additional tags for Redis cluster resources"
  default     = {}
}