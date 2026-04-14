output "state_bucket_name" {
  description = "S3 bucket that stores Terraform state."
  value       = aws_s3_bucket.tf_state.bucket
}

output "lock_table_name" {
  description = "DynamoDB table used for state locking."
  value       = aws_dynamodb_table.tf_lock.name
}

output "backend_config_snippet" {
  description = "Drop-in values for the main module's backend.tf."
  value = <<-EOT
    bucket         = "${aws_s3_bucket.tf_state.bucket}"
    key            = "order-tracker/terraform.tfstate"
    region         = "${var.region}"
    dynamodb_table = "${aws_dynamodb_table.tf_lock.name}"
    encrypt        = true
  EOT
}
