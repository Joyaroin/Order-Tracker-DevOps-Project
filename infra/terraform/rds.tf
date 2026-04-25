resource "random_password" "db" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "app" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = module.vpc.private_subnets

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-subnets"
  })
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "Allow PostgreSQL access from EKS worker nodes."
  vpc_id      = module.vpc.vpc_id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rds"
  })
}

resource "aws_security_group_rule" "rds_from_eks_nodes" {
  type                     = "ingress"
  description              = "PostgreSQL from EKS worker nodes"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = module.eks.node_security_group_id
}

resource "aws_security_group_rule" "rds_egress" {
  type              = "egress"
  description       = "Allow RDS outbound responses"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.rds.id
}

resource "aws_db_instance" "app" {
  identifier = "${var.project_name}-postgres"

  engine         = "postgres"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.app.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 1
  deletion_protection     = false
  skip_final_snapshot     = true
  apply_immediately       = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-postgres"
  })
}
