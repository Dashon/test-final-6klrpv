# Database Connection Information
output "db_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.main.id
}

# Network Security Information
output "db_security_group_id" {
  description = "The ID of the security group attached to the RDS instance"
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}