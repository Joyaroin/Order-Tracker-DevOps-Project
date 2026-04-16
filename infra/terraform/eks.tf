module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Public API endpoint is enabled so `aws eks update-kubeconfig` works from
  # GitHub Actions runners and local developer machines. Restrict in prod.
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  enable_cluster_creator_admin_permissions = true

  # Required for dynamic EBS-backed PVC provisioning used by Kafka/Postgres.
  cluster_addons = {
    aws-ebs-csi-driver = {}
  }

  eks_managed_node_groups = {
    standard-workers = {
      ami_type       = "AL2_x86_64"
      instance_types = var.node_instance_types

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      # Managed node group lives in private subnets; outbound internet via the NAT gateway.
      subnet_ids = module.vpc.private_subnets
    }
  }

  tags = local.common_tags
}
