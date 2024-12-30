# AWS Provider configuration with version constraint
# AWS Provider version ~> 4.0
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# User uploads bucket for storing user-generated content
resource "aws_s3_bucket" "user_uploads" {
  bucket        = "${var.project_name}-${var.environment}-user-uploads"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Purpose       = "User uploads storage"
    SecurityLevel = "Private"
    Environment   = var.environment
  })
}

# ML models bucket for storing machine learning models and training data
resource "aws_s3_bucket" "ml_models" {
  bucket        = "${var.project_name}-${var.environment}-ml-models"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Purpose       = "ML models storage"
    SecurityLevel = "Private"
    Environment   = var.environment
  })
}

# Static assets bucket for CDN-distributed content
resource "aws_s3_bucket" "static_assets" {
  bucket        = "${var.project_name}-${var.environment}-static-assets"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Purpose       = "Static assets delivery"
    SecurityLevel = "Public"
    Environment   = var.environment
  })
}

# Enforce bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# Enable versioning for data protection
resource "aws_s3_bucket_versioning" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_versioning" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Configure server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access for private buckets
resource "aws_s3_bucket_public_access_block" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure CORS for static assets bucket
resource "aws_s3_bucket_cors_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = var.cors_max_age_seconds
  }
}

# Configure lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    id     = "intelligent_tiering"
    status = var.lifecycle_rules_enabled ? "Enabled" : "Disabled"

    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id

  rule {
    id     = "archive_old_versions"
    status = var.lifecycle_rules_enabled ? "Enabled" : "Disabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }
  }
}

# Enable bucket logging
resource "aws_s3_bucket_logging" "user_uploads" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.user_uploads.id

  target_bucket = "${var.project_name}-${var.environment}-logs"
  target_prefix = "s3-access-logs/user-uploads/"
}

resource "aws_s3_bucket_logging" "ml_models" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.ml_models.id

  target_bucket = "${var.project_name}-${var.environment}-logs"
  target_prefix = "s3-access-logs/ml-models/"
}