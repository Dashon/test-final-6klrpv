# Configure Terraform settings and AWS provider requirements
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Data source for VPC and subnet information
data "aws_vpc" "main" {
  id = data.terraform_remote_state.vpc.outputs.vpc_id
}

data "aws_subnet_ids" "private" {
  vpc_id = data.aws_vpc.main.id
  filter {
    name   = "tag:Tier"
    values = ["Private"]
  }
}

# Redis replication group for high availability
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_id
  replication_group_description = "Redis cluster for AI-Enhanced Social Travel Platform"
  node_type                     = var.node_type
  number_cache_clusters         = var.num_cache_nodes
  port                         = 6379
  
  # Network configuration
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  
  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Security settings
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                 = var.auth_token
  
  # Backup and maintenance settings
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "mon:05:00-mon:07:00"
  notification_topic_arn  = var.sns_topic_arn
  
  # Tags for resource management
  tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "redis-cache"
    Purpose     = "session-management"
  })
}

# Redis parameter group with optimized settings
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis6.x"
  name        = "${var.cluster_id}-params"
  description = "Custom parameters for AI platform Redis cluster"

  # Performance and memory optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "1800"  # 30-minute session timeout
  }

  parameter {
    name  = "maxmemory-percent"
    value = "75"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
}

# Subnet group for Redis deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.cluster_id}-subnet"
  subnet_ids  = data.aws_subnet_ids.private.ids
  description = "Private subnet group for Redis cluster"
}

# Security group for Redis access control
resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-sg"
  vpc_id      = data.aws_vpc.main.id
  description = "Security group for Redis cluster"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Redis access from application layer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.sns_topic_arn]
  ok_actions         = [var.sns_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.cluster_id}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = [var.sns_topic_arn]
  ok_actions         = [var.sns_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}