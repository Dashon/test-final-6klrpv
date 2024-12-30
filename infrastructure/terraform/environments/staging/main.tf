# Configure Terraform and required providers
terraform {
  required_version = ">= 1.0.0"

  # Configure S3 backend for state management
  backend "s3" {
    bucket         = "ai-travel-platform-staging-tfstate"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.5"
    }
  }
}

# Configure AWS Provider with staging profile
provider "aws" {
  region  = var.aws_region
  profile = "staging"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
      Stage       = "staging"
    }
  }
}

# VPC Module for staging environment
module "vpc" {
  source = "../modules/vpc"

  project_name         = var.project_name
  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  public_subnet_count = 3
  private_subnet_count = 3
  enable_nat_gateway  = true
  single_nat_gateway  = false # Using multiple NAT gateways for high availability

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "staging-infrastructure"
  }
}

# EKS Module for container orchestration
module "eks" {
  source = "../modules/eks"

  cluster_name           = "${var.project_name}-${var.environment}"
  cluster_version       = var.eks_cluster_version
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  
  # Staging-specific EKS configurations
  enable_private_endpoint = true
  enable_public_endpoint = true
  service_ipv4_cidr     = "172.20.0.0/16"
  
  # Node group configurations
  node_group_min_size    = 2
  node_group_max_size    = 5
  node_group_desired_size = 3
  node_instance_types    = ["t3.xlarge"]
  node_volume_size       = 100

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Component   = "kubernetes"
  }
}

# RDS Module for database infrastructure
module "rds" {
  source = "../modules/rds"

  identifier           = "${var.project_name}-${var.environment}"
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.private_subnet_ids
  
  # Staging database configurations
  instance_class      = "db.r6g.xlarge"
  allocated_storage   = 100
  max_allocated_storage = 500
  multi_az           = true
  
  # Backup and maintenance configurations
  backup_retention_period = 14
  backup_window         = "03:00-04:00"
  maintenance_window    = "Mon:04:00-Mon:05:00"
  
  # Security configurations
  storage_encrypted    = true
  deletion_protection = true
  skip_final_snapshot = false
  
  # Monitoring configurations
  monitoring_interval = 30
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Component   = "database"
  }
}

# API Gateway Module for request handling
module "api_gateway" {
  source = "../modules/api-gateway"

  environment = var.environment
  region     = var.aws_region
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  cluster_id = module.eks.cluster_id
  
  # Kong API Gateway configurations
  kong_version = "3.3.1"
  enable_monitoring = true
  enable_waf       = true
  
  # Rate limiting for staging environment
  rate_limiting_config = {
    enabled             = true
    requests_per_second = 100
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Component   = "api-gateway"
  }
}

# Output important resource identifiers
output "vpc_id" {
  description = "ID of the staging VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for staging EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "Endpoint for staging RDS instance"
  value       = module.rds.rds_instance.endpoint
  sensitive   = true
}

output "api_gateway_endpoint" {
  description = "Endpoint for staging API Gateway"
  value       = module.api_gateway.kong_proxy_endpoint
  sensitive   = true
}