# Provider configuration
terraform {
  required_version = ">= 1.0.0"
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
      version = "~> 2.0"
    }
  }
}

# Local variables for common resource tagging
locals {
  common_tags = merge(
    var.tags,
    {
      Environment        = var.environment
      ManagedBy         = "terraform"
      Service           = "api-gateway"
      SecurityZone      = "external"
      DataClassification = "restricted"
      Backup            = "required"
    }
  )
}

# Security group for Kong API Gateway
resource "aws_security_group" "kong" {
  name_prefix = "kong-api-gateway-${var.environment}"
  description = "Security group for Kong API Gateway"
  vpc_id      = var.vpc_id

  # Proxy traffic
  ingress {
    description = "Kong proxy HTTP traffic"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Kong proxy HTTPS traffic"
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Admin API (internal only)
  ingress {
    description = "Kong admin API"
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  ingress {
    description = "Kong admin SSL API"
    from_port   = 8444
    to_port     = 8444
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

# Kong API Gateway Helm Release
resource "helm_release" "kong" {
  name             = "kong"
  repository       = "https://charts.konghq.com"
  chart            = "kong"
  version          = var.kong_version
  namespace        = "api-gateway"
  create_namespace = true

  values = [
    yamlencode({
      image = {
        repository = "kong/kong-gateway"
        tag        = var.kong_version
        pullPolicy = "Always"
      }

      replicaCount = 3

      autoscaling = {
        enabled                        = true
        minReplicas                   = 3
        maxReplicas                   = 10
        targetCPUUtilizationPercentage    = 75
        targetMemoryUtilizationPercentage = 75
      }

      resources = {
        requests = {
          cpu    = "500m"
          memory = "512Mi"
        }
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
      }

      readinessProbe = {
        initialDelaySeconds = 30
        periodSeconds      = 10
        timeoutSeconds     = 5
        successThreshold   = 1
        failureThreshold   = 3
      }

      livenessProbe = {
        initialDelaySeconds = 30
        periodSeconds      = 10
        timeoutSeconds     = 5
        successThreshold   = 1
        failureThreshold   = 3
      }

      podDisruptionBudget = {
        enabled     = true
        minAvailable = "50%"
      }

      env = {
        database         = "off"
        proxy_access_log = "/dev/stdout"
        admin_access_log = "/dev/stdout"
        proxy_error_log  = "/dev/stderr"
        admin_error_log  = "/dev/stderr"
        ssl_cert        = "/etc/secrets/tls/tls.crt"
        ssl_cert_key    = "/etc/secrets/tls/tls.key"
      }

      proxy = {
        enabled = true
        type    = "LoadBalancer"
        annotations = {
          "service.beta.kubernetes.io/aws-load-balancer-type"           = "nlb"
          "service.beta.kubernetes.io/aws-load-balancer-internal"       = "false"
          "service.beta.kubernetes.io/aws-load-balancer-ssl-cert"       = var.acm_certificate_arn
          "service.beta.kubernetes.io/aws-load-balancer-ssl-ports"      = "443"
          "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout" = "60"
        }
      }

      admin = {
        enabled = true
        type    = "ClusterIP"
        annotations = {
          "service.beta.kubernetes.io/aws-load-balancer-internal" = "true"
        }
      }

      serviceMonitor = var.enable_monitoring ? {
        enabled       = true
        interval      = "30s"
        scrapeTimeout = "10s"
        namespace     = "monitoring"
        labels = {
          release = "prometheus"
        }
        metricRelabelings = [
          {
            sourceLabels = ["__name__"]
            regex       = "kong_.*"
            action      = "keep"
          }
        ]
      } : null

      plugins = {
        configMaps = [
          {
            name       = "kong-plugin-rate-limiting"
            pluginName = "rate-limiting"
            config     = {
              minute         = var.rate_limiting_config.requests_per_second * 60
              hour          = var.rate_limiting_config.requests_per_second * 3600
              policy        = "redis"
              fault_tolerant = true
            }
          },
          {
            name       = "kong-plugin-request-transformer"
            pluginName = "request-transformer"
          },
          {
            name       = "kong-plugin-auth"
            pluginName = "ai-travel-auth"
          },
          {
            name       = "kong-plugin-cors"
            pluginName = "cors"
            config     = {
              origins          = ["https://*.ai-travel-platform.com"]
              methods          = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
              headers          = ["Authorization", "Content-Type"]
              exposed_headers  = ["X-Auth-Token"]
              credentials     = true
              max_age         = 3600
            }
          }
        ]
      }
    })
  ]

  depends_on = [
    aws_security_group.kong
  ]
}

# WAF configuration for API Gateway if enabled
resource "aws_wafv2_web_acl" "api_gateway" {
  count = var.enable_waf ? 1 : 0

  name        = "kong-api-gateway-${var.environment}"
  description = "WAF rules for Kong API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  tags = local.common_tags

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "KongAPIGatewayWAFMetric"
    sampled_requests_enabled  = true
  }
}