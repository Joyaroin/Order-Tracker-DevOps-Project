variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Short project identifier, used as a name prefix for resources."
  type        = string
  default     = "order-tracker"
}

variable "cluster_name" {
  description = "EKS cluster name. Kept consistent with the legacy eksctl name so existing workflows keep working."
  type        = string
  default     = "k8s-learning"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS control plane."
  type        = string
  default     = "1.30"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones used for subnets. Defaults to two AZs in us-east-2."
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes."
  type        = number
  default     = 3
}

variable "ecr_repository_names" {
  description = "ECR repositories to create for application images."
  type        = list(string)
  default     = ["order-api", "alerting-service", "frontend"]
}

variable "db_name" {
  description = "PostgreSQL database name used by the application."
  type        = string
  default     = "ordertracker"
}

variable "db_username" {
  description = "PostgreSQL master username used by the application."
  type        = string
  default     = "ordertracker"
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated RDS storage in GiB."
  type        = number
  default     = 20
}

variable "tags" {
  description = "Extra tags applied to all resources."
  type        = map(string)
  default     = {}
}
