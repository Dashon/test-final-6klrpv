# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC for container orchestration platform deployment and resource association"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC for network planning and security group configuration"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of public subnet IDs distributed across availability zones for load balancer and ingress deployment"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs distributed across availability zones for secure workload deployment including EKS clusters and RDS instances"
  value       = aws_subnet.private[*].id
}

# Additional Network Information
output "availability_zones" {
  description = "List of availability zones where subnets are deployed for high availability planning"
  value       = data.aws_availability_zones.available.names
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs used for private subnet internet access"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway attached to the VPC for public internet access"
  value       = aws_internet_gateway.main.id
}

# Route Table Information
output "public_route_table_id" {
  description = "ID of the public route table for network traffic management"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of private route table IDs for internal network traffic management"
  value       = aws_route_table.private[*].id
}

# Network ACL Information
output "public_nacl_id" {
  description = "ID of the Network ACL protecting public subnets"
  value       = aws_network_acl.public.id
}

output "private_nacl_id" {
  description = "ID of the Network ACL protecting private subnets"
  value       = aws_network_acl.private.id
}

# Tags Output
output "vpc_tags" {
  description = "Tags applied to the VPC for resource management and cost allocation"
  value       = aws_vpc.main.tags
}

# Network Configuration State
output "network_state" {
  description = "Current state of network configuration including counts and enablement flags"
  value = {
    public_subnet_count  = var.public_subnet_count
    private_subnet_count = var.private_subnet_count
    nat_gateway_enabled  = var.enable_nat_gateway
    single_nat_gateway   = var.single_nat_gateway
  }
}