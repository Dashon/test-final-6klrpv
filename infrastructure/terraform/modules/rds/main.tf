# Configure required providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws" # v4.0
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random" # v3.0
      version = "~> 3.0"
    }
  }
}

# Generate random suffix for unique resource naming
resource "random_id" "suffix" {
  byte_length = 4
}

# Create DB subnet group
resource "aws_db_subnet_group" "main" {
  name = "${var.identifier}-${var.environment}-${random_id.suffix.hex}"
  subnet_ids = var.database_subnet_ids
  
  tags = merge(var.tags, {
    Name        = "${var.identifier}-${var.environment}-subnet-group"
    Environment = var.environment
  })
}

# Create security group for RDS access
resource "aws_security_group" "rds" {
  name        = "${var.identifier}-${var.environment}-sg-${random_id.suffix.hex}"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = var.vpc_id

  # PostgreSQL port ingress
  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    cidr_blocks     = ["10.0.0.0/8"] # Restrict to VPC CIDR
    description     = "PostgreSQL access from within VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name        = "${var.identifier}-${var.environment}-sg"
    Environment = var.environment
  })
}

# Create KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = merge(var.tags, {
    Name        = "${var.identifier}-${var.environment}-kms"
    Environment = var.environment
  })

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

# Create DB parameter group
resource "aws_db_parameter_group" "main" {
  family = var.parameter_group_family
  name   = "${var.identifier}-${var.environment}-pg-${random_id.suffix.hex}"

  parameter {
    name  = "shared_buffers"
    value = "4GB"
  }

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "work_mem"
    value = "64MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "512MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "12GB"
  }

  parameter {
    name  = "wal_buffers"
    value = "16MB"
  }

  tags = merge(var.tags, {
    Name        = "${var.identifier}-${var.environment}-pg"
    Environment = var.environment
  })
}

# Create primary RDS instance
resource "aws_db_instance" "main" {
  identifier = "${var.identifier}-${var.environment}-${random_id.suffix.hex}"
  
  # Engine configuration
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage

  # Database configuration
  db_name  = replace(var.identifier, "-", "_")
  username = "dbadmin"
  password = random_id.suffix.hex
  port     = var.port

  # High availability configuration
  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Storage configuration
  storage_encrypted = var.storage_encrypted
  kms_key_id       = aws_kms_key.rds.arn

  # Backup configuration
  backup_retention_period   = var.backup_retention_period
  backup_window            = var.backup_window
  maintenance_window       = var.maintenance_window
  auto_minor_version_upgrade = true

  # Protection configuration
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = "${var.identifier}-${var.environment}-final-${random_id.suffix.hex}"

  # Performance and monitoring
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  monitoring_interval                   = var.monitoring_interval
  monitoring_role_arn                  = var.enhanced_monitoring_role_arn
  enabled_cloudwatch_logs_exports      = var.enabled_cloudwatch_logs_exports

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Snapshot configuration
  copy_tags_to_snapshot = true

  tags = merge(var.tags, {
    Name        = "${var.identifier}-${var.environment}"
    Environment = var.environment
  })
}

# Outputs
output "rds_instance" {
  description = "RDS instance details"
  value = {
    endpoint = aws_db_instance.main.endpoint
    arn      = aws_db_instance.main.arn
    id       = aws_db_instance.main.id
  }
}