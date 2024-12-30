# Configure Terraform and required providers
terraform {
  required_version = ">= 1.0.0"

  # Configure remote state storage with encryption and versioning
  backend "s3" {
    bucket         = "ai-travel-platform-tfstate-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    versioning {
      enabled = true
    }
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
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "ai-travel-platform"
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module Configuration
module "vpc" {
  source = "../modules/vpc"

  environment            = var.environment
  vpc_cidr              = var.vpc_cidr
  public_subnet_count   = 3
  private_subnet_count  = 3
  enable_nat_gateway    = true
  single_nat_gateway    = false
  enable_flow_logs      = true
  flow_logs_retention   = 30
  enable_network_firewall = true
  
  network_acl_rules = {
    strict = true
  }
  
  security_group_rules = {
    enhanced = true
  }

  tags = {
    Environment = var.environment
    CostCenter  = "infrastructure"
  }
}

# EKS Module Configuration
module "eks" {
  source = "../modules/eks"

  environment     = var.environment
  cluster_version = "1.26"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids

  node_groups = {
    min_size     = 5
    max_size     = 15
    desired_size = 7
    instance_types = ["t3.large", "t3.xlarge"]
    capacity_type = "SPOT_WITH_ON_DEMAND_BACKUP"
  }

  monitoring = {
    enable_prometheus         = true
    enable_container_insights = true
    log_retention_days       = 30
  }

  security = {
    enable_pod_security_policy = true
    enable_network_policy     = true
    enable_secrets_encryption = true
  }

  tags = {
    Environment = var.environment
    CostCenter  = "compute"
  }
}

# RDS Module Configuration
module "rds" {
  source = "../modules/rds"

  environment              = var.environment
  identifier              = "ai-travel-platform"
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  instance_class          = "db.r6g.xlarge"
  multi_az                = true
  backup_retention_period = 30
  deletion_protection     = true
  storage_encrypted       = true
  monitoring_interval     = 10
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  maintenance_window = "sun:03:00-sun:04:00"
  backup_window     = "02:00-03:00"

  tags = {
    Environment = var.environment
    CostCenter  = "database"
  }
}

# API Gateway Module Configuration
module "api_gateway" {
  source = "../modules/api-gateway"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  cluster_id  = module.eks.cluster_id

  enable_waf = true
  waf_rules = {
    rate_limit              = "5000/minute"
    ip_reputation_lists     = true
    sql_injection_protection = true
    xss_protection          = true
  }

  cors_configuration = {
    allowed_origins = ["https://*.ai-travel-platform.com"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE"]
    max_age        = 7200
  }

  monitoring = {
    access_logs_enabled      = true
    detailed_metrics_enabled = true
    tracing_enabled         = true
  }

  tags = {
    Environment = var.environment
    CostCenter  = "networking"
  }
}

# Output important infrastructure values
output "vpc_id" {
  description = "ID of the production VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for production EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "Endpoint for production RDS instance"
  value       = module.rds.rds_endpoint
  sensitive   = true
}

output "api_gateway_endpoint" {
  description = "Endpoint for production API Gateway"
  value       = module.api_gateway.kong_proxy_endpoint
}