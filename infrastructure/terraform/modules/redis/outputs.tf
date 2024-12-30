# Primary cluster identification output
output "cluster_id" {
  description = "The ID of the ElastiCache Redis cluster for resource referencing and monitoring"
  value       = aws_elasticache_replication_group.redis.id
}

# Primary endpoint output for write operations
output "primary_endpoint" {
  description = "The primary endpoint address for Redis write operations and direct node access"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# Reader endpoint output for read scaling
output "reader_endpoint" {
  description = "The reader endpoint for Redis read replicas supporting load balancing and read scaling"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

# Port number output for client connections
output "port" {
  description = "The port number the Redis cluster is listening on for client connections"
  value       = aws_elasticache_replication_group.redis.port
}

# Security group ID output for network configuration
output "security_group_id" {
  description = "The ID of the security group controlling network access to the Redis cluster"
  value       = aws_security_group.redis.id
}

# Connection information output
output "connection_info" {
  description = "Map of connection information for Redis cluster configuration"
  value = {
    auth_enabled = aws_elasticache_replication_group.redis.transit_encryption_enabled
    multi_az     = aws_elasticache_replication_group.redis.multi_az_enabled
    node_type    = aws_elasticache_replication_group.redis.node_type
    num_nodes    = aws_elasticache_replication_group.redis.number_cache_clusters
  }
}

# Monitoring information output
output "monitoring_info" {
  description = "Information required for monitoring and alerting configuration"
  value = {
    alarm_cpu_arn     = aws_cloudwatch_metric_alarm.redis_cpu.arn
    alarm_memory_arn  = aws_cloudwatch_metric_alarm.redis_memory.arn
    sns_topic_arn    = var.sns_topic_arn
  }
}

# Parameter group information
output "parameter_group_info" {
  description = "Information about the Redis parameter group configuration"
  value = {
    name   = aws_elasticache_parameter_group.redis.name
    family = aws_elasticache_parameter_group.redis.family
  }
}

# Subnet group information
output "subnet_group_info" {
  description = "Information about the Redis subnet group configuration"
  value = {
    name        = aws_elasticache_subnet_group.redis.name
    subnet_ids  = aws_elasticache_subnet_group.redis.subnet_ids
  }
}

# Maintenance window information
output "maintenance_info" {
  description = "Maintenance and backup window configuration details"
  value = {
    maintenance_window = aws_elasticache_replication_group.redis.maintenance_window
    snapshot_window   = aws_elasticache_replication_group.redis.snapshot_window
    retention_period  = aws_elasticache_replication_group.redis.snapshot_retention_limit
  }
}