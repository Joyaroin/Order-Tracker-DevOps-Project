output "region" {
  description = "AWS region."
  value       = var.region
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API server endpoint."
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded cluster CA cert."
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group attached to the cluster control plane."
  value       = module.eks.cluster_security_group_id
}

output "vpc_id" {
  description = "VPC ID."
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by the node group."
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "Public subnet IDs used by ELBs."
  value       = module.vpc.public_subnets
}

output "ecr_repository_urls" {
  description = "Map of service name to ECR repository URL."
  value = {
    for name, repo in aws_ecr_repository.app : name => repo.repository_url
  }
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint hostname."
  value       = aws_db_instance.app.address
}

output "rds_port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.app.port
}

output "rds_database_name" {
  description = "Application database name."
  value       = aws_db_instance.app.db_name
}

output "rds_username" {
  description = "Application database username."
  value       = aws_db_instance.app.username
}

output "rds_password" {
  description = "Generated application database password."
  value       = random_password.db.result
  sensitive   = true
}

output "kubeconfig_command" {
  description = "Command to configure kubectl against the new cluster."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}
