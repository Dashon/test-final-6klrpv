# Environment variable for deployment stage
variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be one of: development, staging, production"
  }
}

# AWS region for deployment
variable "region" {
  description = "AWS region for API Gateway deployment"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-west-2)"
  }
}

# VPC configuration
variable "vpc_id" {
  description = "ID of the VPC where API Gateway will be deployed"
  type        = string
  
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must start with 'vpc-'"
  }
}

# Subnet configuration
variable "subnet_ids" {
  description = "List of subnet IDs for API Gateway deployment"
  type        = list(string)
  
  validation {
    condition     = length(var.subnet_ids) > 0
    error_message = "At least one subnet ID must be provided"
  }
}

# EKS cluster configuration
variable "cluster_id" {
  description = "EKS cluster ID where Kong will be deployed"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z][-a-zA-Z0-9]*$", var.cluster_id))
    error_message = "Cluster ID must be a valid EKS cluster identifier"
  }
}

# Kong version configuration
variable "kong_version" {
  description = "Version of Kong API Gateway to deploy"
  type        = string
  default     = "3.3.1"
  
  validation {
    condition     = can(regex("^\\d+\\.\\d+\\.\\d+$", var.kong_version))
    error_message = "Kong version must be in semantic versioning format (x.y.z)"
  }
}

# Monitoring configuration
variable "enable_monitoring" {
  description = "Enable Prometheus ServiceMonitor for Kong metrics"
  type        = bool
  default     = true
}

# WAF configuration
variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway protection"
  type        = bool
  default     = true
}

# Rate limiting configuration
variable "rate_limiting_config" {
  description = "Rate limiting configuration for API Gateway"
  type = object({
    enabled             = bool
    requests_per_second = number
  })
  default = {
    enabled             = true
    requests_per_second = 100
  }

  validation {
    condition     = var.rate_limiting_config.requests_per_second > 0
    error_message = "Requests per second must be greater than 0"
  }
}

# Resource tagging
variable "tags" {
  description = "Additional tags for API Gateway resources"
  type        = map(string)
  default     = {}

  validation {
    condition     = can([for k, v in var.tags : regex("^[\\w\\s\\-\\.\\:/@]+$", v)])
    error_message = "Tag values can only contain alphanumeric characters, spaces, and the following special characters: - . : / @"
  }
}