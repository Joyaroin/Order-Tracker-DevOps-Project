# Terraform Infrastructure

This directory provisions the AWS infrastructure for the Order Tracker project —
VPC, EKS cluster, managed node group, and ECR repositories — replacing the
previous `eksctl`-based workflow.

Application deployment is still handled by ArgoCD + Kustomize/Helm; Terraform
only manages the platform underneath.

## Layout

```
infra/terraform/
├── bootstrap/            # One-time: creates S3 bucket + DynamoDB table for remote state
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── versions.tf
├── versions.tf           # Terraform + AWS provider version pins
├── providers.tf          # AWS provider config with default tags
├── backend.tf            # S3 remote state backend (values injected at init time)
├── locals.tf             # Common tags
├── variables.tf          # Inputs
├── vpc.tf                # VPC via terraform-aws-modules/vpc/aws
├── eks.tf                # EKS cluster + managed node group via terraform-aws-modules/eks/aws
├── ecr.tf                # ECR repos for order-api, alerting-service, frontend
├── outputs.tf            # Cluster / VPC / ECR outputs
├── terraform.tfvars.example
└── .gitignore
```

The root module is flat — one `.tf` file per concern. That's easier to read for
a portfolio project than deeply nested env-per-directory layouts, and this
project only has one cluster. If you later need per-environment infra (dev
cluster + prod cluster), switch to Terraform workspaces or add
`environments/<name>/` directories.

## State backend

State is stored in **S3 with DynamoDB-based locking**. The bucket and lock
table are created once by the `bootstrap/` submodule (which uses local state
for itself — you only run it a single time).

Why remote state: it's the standard for team use, survives runner recreation,
and DynamoDB locking prevents two `apply`s from stomping each other. Local
state would be simpler but falls over as soon as GitHub Actions runs
`terraform apply` on a fresh runner.

The backend bucket name is **not committed** to this repo because S3 bucket
names are globally unique. It's passed in at `terraform init` time via
`-backend-config`.

## First-time setup (bootstrap)

Run this **once** per AWS account, from a machine with admin-ish AWS creds:

```bash
cd infra/terraform/bootstrap

terraform init
terraform apply \
  -var="state_bucket_name=order-tracker-tf-state-<your-account-id>"
```

The bucket name must be globally unique. The suggested convention is
`order-tracker-tf-state-<account-id>`. Save the outputs — you'll need them
when initializing the root module.

## Day-to-day: plan / apply / destroy

```bash
cd infra/terraform

# Initialize once per clone. Replace <bucket> with the one bootstrap created.
terraform init \
  -backend-config="bucket=order-tracker-tf-state-<account-id>" \
  -backend-config="key=order-tracker/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=order-tracker-tf-locks" \
  -backend-config="encrypt=true"

terraform plan
terraform apply
terraform destroy
```

## Variables

All inputs have sensible defaults matching the existing project. Override any
of them via `terraform.tfvars`, `-var`, or `TF_VAR_*` env vars. The ones you
might want to change:

| Variable              | Default         | Notes                                       |
| --------------------- | --------------- | ------------------------------------------- |
| `region`              | `us-east-2`     | AWS region                                  |
| `cluster_name`        | `k8s-learning`  | Kept the same so existing workflows still work |
| `cluster_version`     | `1.30`          | EKS Kubernetes version                      |
| `node_instance_types` | `["t3.medium"]` | Managed node group instance types           |
| `node_desired_size`   | `2`             | Starting node count                         |
| `node_min_size`       | `1`             | Autoscaling floor                           |
| `node_max_size`       | `3`             | Autoscaling ceiling                         |

See `variables.tf` for the full list and `terraform.tfvars.example` for a
starter file.

## GitHub Actions integration

Two workflows drive infra lifecycle from CI:

- **`.github/workflows/create-cluster.yml`** — runs `terraform init` + `apply`,
  then installs ArgoCD and applies the manifests in `k8s/argocd/` (including
  the environment `ApplicationSet` and shared Kafka app). This is the workflow
  you manually trigger to spin up the cluster.
- **`.github/workflows/destroy-cluster.yml`** — runs `terraform destroy`. No
  more shell-based VPC dependency cleanup — Terraform handles it because every
  resource is tracked in state.
- **`.github/workflows/terraform-plan.yml`** — runs `terraform plan` on PRs
  that touch `infra/terraform/**` so you can review infra changes in the PR.

### Required GitHub Actions configuration

Set these as **variables** (not secrets) at the repo or org level:

| Name                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `AWS_ROLE_TO_ASSUME`    | IAM role ARN for OIDC-based AWS auth (already set) |
| `TF_STATE_BUCKET`       | The S3 bucket `bootstrap/` created                 |
| `TF_STATE_LOCK_TABLE`   | The DynamoDB table `bootstrap/` created (default: `order-tracker-tf-locks`) |

Set this as a **secret**:

| Name            | Purpose                                                         |
| --------------- | --------------------------------------------------------------- |
| `DB_PASSWORD`   | Bootstraps the `db-credentials` secret in `dev` and `staging` for the Postgres apps and service pods |

The OIDC role needs permissions to manage:
VPC, EC2, EKS, IAM (for cluster/node roles), ECR, S3 (state bucket),
DynamoDB (lock table), CloudWatch Logs.

## Assumptions

- **OIDC role exists** — this refactor does not create or modify the IAM role
  used by GitHub Actions. It assumes `vars.AWS_ROLE_TO_ASSUME` is already
  wired up with sufficient permissions.
- **Legacy cluster is torn down first** — if you have a running
  `eksctl`-created `k8s-learning` cluster, destroy it before running
  `terraform apply`, otherwise resource name conflicts (IAM roles, etc.) will
  cause failures. The legacy destroy workflow still works for this one-time
  cleanup.
- **Single NAT gateway** — to save cost. Good enough for a learning/portfolio
  cluster. For production, set `single_nat_gateway = false` in `vpc.tf` to get
  one NAT per AZ.
- **Public EKS endpoint** — enabled so CI runners can reach the API server
  without a bastion. Lock this down (`cluster_endpoint_public_access_cidrs`)
  before using this for anything real.

## Follow-up improvements

Things worth adding if you keep evolving this project:

1. **Split per-environment infra** — use Terraform workspaces (`terraform
   workspace new dev`) or duplicate root modules if you want separate clusters
   for dev vs. prod.
2. **Tighten the public endpoint** — add `cluster_endpoint_public_access_cidrs`
   restricted to GitHub Actions egress ranges or a VPN.
3. **Add IRSA roles** — create IAM roles for Kubernetes service accounts
   (external-dns, cert-manager, aws-load-balancer-controller, etc.) directly
   in Terraform.
4. **Bootstrap the OIDC provider in Terraform too** — right now the GitHub
   OIDC role is assumed to exist. Managing it in `infra/terraform/iam.tf`
   would make the repo truly reproducible from scratch.
5. **Drift detection** — schedule `terraform plan` on a cron so changes made
   in the AWS console show up as CI alerts.
