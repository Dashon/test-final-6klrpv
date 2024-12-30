# Core cluster information outputs
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "The base64 encoded certificate data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

# Node group information
output "node_group_arn" {
  description = "The ARN of the EKS Node Group"
  value       = aws_eks_node_group.main.arn
}

# OIDC provider information for IAM role configuration
output "cluster_oidc_issuer_url" {
  description = "The URL of the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Additional cluster information for operations and monitoring
output "cluster_version" {
  description = "The Kubernetes server version of the cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_platform_version" {
  description = "The platform version of the EKS cluster"
  value       = aws_eks_cluster.main.platform_version
}

output "cluster_status" {
  description = "The status of the EKS cluster"
  value       = aws_eks_cluster.main.status
}

# Security and encryption information
output "cluster_encryption_key_arn" {
  description = "The ARN of the KMS key used for cluster encryption"
  value       = aws_kms_key.eks.arn
}

output "cluster_role_arn" {
  description = "The ARN of the IAM role used by the EKS cluster"
  value       = aws_iam_role.cluster.arn
}

# Node group configuration details
output "node_group_status" {
  description = "The status of the EKS node group"
  value       = aws_eks_node_group.main.status
}

output "node_group_capacity_type" {
  description = "The capacity type of the EKS node group"
  value       = aws_eks_node_group.main.capacity_type
}

# Networking configuration
output "cluster_vpc_config" {
  description = "The VPC configuration of the EKS cluster"
  value = {
    vpc_id             = aws_eks_cluster.main.vpc_config[0].vpc_id
    subnet_ids         = aws_eks_cluster.main.vpc_config[0].subnet_ids
    security_group_ids = aws_eks_cluster.main.vpc_config[0].security_group_ids
  }
}

# Logging configuration
output "cluster_logging_enabled_types" {
  description = "The enabled logging types for the EKS cluster"
  value       = aws_eks_cluster.main.enabled_cluster_log_types
}

output "cluster_log_group_name" {
  description = "The CloudWatch log group name for EKS cluster logs"
  value       = aws_cloudwatch_log_group.eks.name
}

# Tags information
output "cluster_tags" {
  description = "The tags applied to the EKS cluster"
  value       = aws_eks_cluster.main.tags
}