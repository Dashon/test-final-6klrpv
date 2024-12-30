# Configure Terraform version and backend
terraform {
  required_version = ">= 1.4.0"

  # Configure S3 backend for state management with DynamoDB locking
  backend "s3" {
    bucket         = "ai-travel-platform-terraform-state-dev"
    key            = "development/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock-dev"
  }

  # Required providers with version constraints
  required_providers {
    aws = {
      source  = "hashicorp/aws" # v4.0
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" # v2.0
      version = "~> 2.0"
    }
  }
}

# Configure AWS Provider for development environment
provider "aws" {
  region  = "us-east-1"
  profile = "development"

  default_tags {
    tags = {
      Environment = "development"
      Project     = "ai-travel-platform"
      ManagedBy   = "terraform"
    }
  }
}

# Configure Kubernetes provider for EKS interaction
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      module.eks.cluster_id,
      "--region",
      "us-east-1",
      "--profile",
      "development"
    ]
  }
}

# VPC Module for development environment
module "vpc" {
  source = "../modules/vpc"

  environment          = "development"
  vpc_cidr            = "10.0.0.0/16"
  project_name        = "ai-travel-platform"
  enable_flow_logs    = true
  enable_dns_hostnames = true
  enable_nat_gateway  = true
  single_nat_gateway  = true # Cost optimization for development
  enable_vpn_gateway  = false

  tags = {
    Purpose = "development-testing"
  }
}

# EKS Module for development environment
module "eks" {
  source = "../modules/eks"

  environment         = "development"
  cluster_name       = "ai-travel-platform-dev"
  cluster_version    = "1.26"
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Development-specific node group configuration
  node_groups = {
    default = {
      desired_size   = 2
      min_size      = 1
      max_size      = 3
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }

  enable_public_access  = true
  enable_private_access = true

  # Additional development environment configurations
  cluster_enabled_log_types = ["api", "audit"]
  cluster_log_retention     = 7
  node_volume_size         = 50
}

# Export outputs for reference
output "vpc_id" {
  description = "VPC ID for the development environment"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint for development access"
  value       = module.eks.cluster_endpoint
}

# Pre-plan hooks for security and validation
resource "null_resource" "pre_plan" {
  provisioner "local-exec" {
    command = <<-EOT
      echo 'Running security scan...'
      tfsec .
      echo 'Validating configurations...'
      terraform validate
    EOT
  }
}

# Post-apply hooks for kubeconfig update
resource "null_resource" "post_apply" {
  depends_on = [module.eks]

  provisioner "local-exec" {
    command = <<-EOT
      echo 'Updating kubeconfig...'
      aws eks update-kubeconfig --name ai-travel-platform-dev --region us-east-1 --profile development
    EOT
  }
}