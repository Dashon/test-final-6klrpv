# Core Terraform functionality for variable definitions and validations
terraform {
  required_version = ">=1.0.0"
}

# Project name variable with strict naming convention validation
variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming and tagging"
  default     = "ai-travel-platform"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

# Environment variable with strict validation for allowed values
variable "environment" {
  type        = string
  description = "Environment name for resource configuration and tagging (development, staging, production)"

  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Versioning configuration for data protection
variable "enable_versioning" {
  type        = bool
  description = "Enable versioning for user uploads and ML model buckets (recommended for production)"
  default     = true
}

# Force destroy configuration for bucket management
variable "force_destroy" {
  type        = bool
  description = "Allow destruction of non-empty buckets (use with caution)"
  default     = false
}

# Resource tagging for better management and cost allocation
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources for better resource management"
  default     = {}
}

# CORS configuration for static assets bucket
variable "cors_allowed_origins" {
  type        = list(string)
  description = "List of allowed origins for CORS on static assets bucket"
  default     = ["*"]

  validation {
    condition     = length(var.cors_allowed_origins) > 0
    error_message = "At least one CORS origin must be specified"
  }
}

# CORS preflight cache configuration
variable "cors_max_age_seconds" {
  type        = number
  description = "Max age in seconds for CORS preflight cache (3600 recommended for production)"
  default     = 3600

  validation {
    condition     = var.cors_max_age_seconds >= 0 && var.cors_max_age_seconds <= 86400
    error_message = "CORS max age must be between 0 and 86400 seconds (24 hours)"
  }
}

# Encryption configuration for data security
variable "enable_encryption" {
  type        = bool
  description = "Enable AES-256 server-side encryption for all buckets"
  default     = true
}

# Lifecycle rules for cost optimization
variable "lifecycle_rules_enabled" {
  type        = bool
  description = "Enable lifecycle rules for cost optimization"
  default     = true
}