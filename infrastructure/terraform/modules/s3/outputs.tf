# User uploads bucket outputs
output "user_uploads_bucket_id" {
  value       = aws_s3_bucket.user_uploads.id
  description = "ID of the user uploads S3 bucket for storing user-generated content with versioning enabled"
}

output "user_uploads_bucket_arn" {
  value       = aws_s3_bucket.user_uploads.arn
  description = "ARN of the user uploads S3 bucket for IAM policy and cross-service access configuration"
}

# ML models bucket outputs
output "ml_models_bucket_id" {
  value       = aws_s3_bucket.ml_models.id
  description = "ID of the ML models S3 bucket for storing trained models and training data with versioning enabled"
}

output "ml_models_bucket_arn" {
  value       = aws_s3_bucket.ml_models.arn
  description = "ARN of the ML models S3 bucket for IAM policy and ML service access configuration"
}

# Static assets bucket outputs
output "static_assets_bucket_id" {
  value       = aws_s3_bucket.static_assets.id
  description = "ID of the static assets S3 bucket for storing application assets with versioning enabled"
}

output "static_assets_bucket_arn" {
  value       = aws_s3_bucket.static_assets.arn
  description = "ARN of the static assets S3 bucket for IAM policy and CDN access configuration"
}

output "static_assets_bucket_domain_name" {
  value       = aws_s3_bucket.static_assets.bucket_regional_domain_name
  description = "Regional domain name of the static assets S3 bucket for CloudFront CDN origin configuration and direct S3 access"
}