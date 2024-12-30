# Output definitions for Kong API Gateway module

output "api_gateway_endpoint" {
  description = "Public endpoint URL of the Kong API Gateway"
  value       = "${helm_release.kong.status[0].load_balancer_ingress[0].hostname}"

  depends_on = [
    helm_release.kong
  ]
}

output "admin_api_endpoint" {
  description = "Internal admin API endpoint for Kong management"
  value       = "http://kong-admin.api-gateway.svc.cluster.local:8001"
  sensitive   = true # Marked sensitive as this is an internal management endpoint
}

output "security_group_id" {
  description = "ID of the security group created for Kong API Gateway"
  value       = aws_security_group.kong.id
}

output "namespace" {
  description = "Kubernetes namespace where Kong is deployed"
  value       = helm_release.kong.namespace
}

output "monitoring_enabled" {
  description = "Indicates if Prometheus monitoring is enabled for Kong"
  value       = var.enable_monitoring
}

output "version" {
  description = "Deployed version of Kong API Gateway"
  value       = var.kong_version
}

output "load_balancer_security_rules" {
  description = "Security group rules for the Kong API Gateway load balancer"
  value = {
    proxy_http_port  = "8000"
    proxy_https_port = "8443"
    admin_http_port  = "8001"
    admin_https_port = "8444"
  }
}

output "waf_enabled" {
  description = "Indicates if AWS WAF is enabled for API Gateway protection"
  value       = var.enable_waf
}

output "rate_limiting_config" {
  description = "Applied rate limiting configuration for the API Gateway"
  value = {
    enabled             = var.rate_limiting_config.enabled
    requests_per_second = var.rate_limiting_config.requests_per_second
    requests_per_minute = var.rate_limiting_config.requests_per_second * 60
    requests_per_hour   = var.rate_limiting_config.requests_per_second * 3600
  }
}

output "deployment_info" {
  description = "Deployment information for the API Gateway"
  value = {
    environment = var.environment
    region      = var.region
    vpc_id      = var.vpc_id
    cluster_id  = var.cluster_id
  }
}