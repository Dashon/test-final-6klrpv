# Project name variable with length validation
variable "project_name" {
  type        = string
  description = "Name of the project used for resource tagging and identification across AWS services"
  default     = "ai-travel-platform"

  validation {
    condition     = length(var.project_name) <= 32
    error_message = "Project name must not exceed 32 characters"
  }
}

# Environment variable with allowed values validation
variable "environment" {
  type        = string
  description = "Deployment environment identifier used for resource segregation and configuration"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# VPC CIDR block variable with network range validation
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC, must be a valid IPv4 range with sufficient capacity for all subnets"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && split("/", var.vpc_cidr)[1] <= 16
    error_message = "VPC CIDR must be a valid IPv4 CIDR block with a prefix length of /16 or larger"
  }
}

# Public subnet count variable with range validation
variable "public_subnet_count" {
  type        = number
  description = "Number of public subnets to create across different availability zones for load balancers and public-facing resources"
  default     = 3

  validation {
    condition     = var.public_subnet_count > 0 && var.public_subnet_count <= 3
    error_message = "Public subnet count must be between 1 and 3 to balance availability and cost"
  }
}

# Private subnet count variable with range validation
variable "private_subnet_count" {
  type        = number
  description = "Number of private subnets to create across different availability zones for application and database resources"
  default     = 3

  validation {
    condition     = var.private_subnet_count > 0 && var.private_subnet_count <= 3
    error_message = "Private subnet count must be between 1 and 3 to balance availability and cost"
  }
}

# NAT Gateway enablement flag
variable "enable_nat_gateway" {
  type        = bool
  description = "Flag to enable NAT Gateway deployment for private subnet internet access, required for external service communication"
  default     = true
}

# Single NAT Gateway flag for cost optimization
variable "single_nat_gateway" {
  type        = bool
  description = "Flag to use a single NAT Gateway for all private subnets instead of one per AZ, reduces cost but impacts availability"
  default     = false
}

# Additional resource tags map
variable "tags" {
  type        = map(string)
  description = "Additional resource tags to be applied to all VPC resources for better resource management and cost allocation"
  default     = {}
}