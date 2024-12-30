# Core Terraform configuration
terraform {
  required_version = ">=1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Cluster Configuration Variables
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster - must be unique within the AWS region"
  
  validation {
    condition     = length(var.cluster_name) <= 100 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter, contain only alphanumeric characters and hyphens, and be no longer than 100 characters"
  }
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.26"

  validation {
    condition     = can(regex("^1\\.(2[4-6])$", var.cluster_version))
    error_message = "Cluster version must be 1.24, 1.25, or 1.26"
  }
}

variable "environment" {
  type        = string
  description = "Environment name for resource tagging and configuration"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Network Configuration Variables
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be deployed"

  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must begin with 'vpc-'"
  }
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for worker nodes - must be in at least two different AZs"

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability"
  }
}

# Endpoint Configuration Variables
variable "enable_private_endpoint" {
  type        = bool
  description = "Enable private API server endpoint for enhanced security"
  default     = true
}

variable "enable_public_endpoint" {
  type        = bool
  description = "Enable public API server endpoint - should be false in production"
  default     = false
}

# Node Group Configuration Variables
variable "node_instance_types" {
  type        = list(string)
  description = "List of EC2 instance types for worker nodes"
  default     = ["t3.large"]

  validation {
    condition     = length(var.node_instance_types) > 0
    error_message = "At least one instance type must be specified"
  }
}

variable "node_group_desired_size" {
  type        = number
  description = "Desired number of worker nodes per group"
  default     = 3

  validation {
    condition     = var.node_group_desired_size >= 1
    error_message = "Desired size must be at least 1"
  }
}

variable "node_group_min_size" {
  type        = number
  description = "Minimum number of worker nodes per group"
  default     = 1

  validation {
    condition     = var.node_group_min_size >= 1
    error_message = "Minimum size must be at least 1"
  }
}

variable "node_group_max_size" {
  type        = number
  description = "Maximum number of worker nodes per group"
  default     = 10

  validation {
    condition     = var.node_group_max_size >= var.node_group_min_size
    error_message = "Maximum size must be greater than or equal to minimum size"
  }
}

# Security Configuration Variables
variable "enable_encryption" {
  type        = bool
  description = "Enable envelope encryption for Kubernetes secrets using AWS KMS"
  default     = true
}

variable "enable_irsa" {
  type        = bool
  description = "Enable IAM roles for service accounts (IRSA)"
  default     = true
}

# Logging Configuration Variables
variable "cluster_log_types" {
  type        = list(string)
  description = "List of control plane logging types to enable"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Tagging Configuration Variables
variable "tags" {
  type        = map(string)
  description = "Additional tags for all EKS resources"
  default     = {}
}