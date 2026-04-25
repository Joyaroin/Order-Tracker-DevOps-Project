module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.13"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr
  azs  = var.azs

  # /20 subnets give plenty of pod IPs per AZ.
  private_subnets = ["10.0.0.0/20", "10.0.16.0/20"]
  public_subnets  = ["10.0.32.0/20", "10.0.48.0/20"]

  enable_nat_gateway      = true
  single_nat_gateway      = true # Cost-saving for a learning cluster; use one-per-AZ in prod.
  enable_dns_hostnames    = true
  enable_dns_support      = true
  map_public_ip_on_launch = false

  # EKS needs these subnet tags so it can discover where to place load balancers.
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  tags = local.common_tags
}
