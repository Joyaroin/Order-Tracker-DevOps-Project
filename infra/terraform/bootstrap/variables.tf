variable "region" {
  description = "AWS region for the state backend resources."
  type        = string
  default     = "us-east-2"
}

variable "state_bucket_name" {
  description = "Globally-unique S3 bucket name for Terraform remote state."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking."
  type        = string
  default     = "order-tracker-tf-locks"
}

variable "tags" {
  description = "Tags applied to bootstrap resources."
  type        = map(string)
  default = {
    Project   = "order-tracker"
    ManagedBy = "terraform-bootstrap"
  }
}
