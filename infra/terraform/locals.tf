locals {
  common_tags = merge(
    {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Environment = "shared"
      Cluster     = var.cluster_name
    },
    var.tags,
  )
}
