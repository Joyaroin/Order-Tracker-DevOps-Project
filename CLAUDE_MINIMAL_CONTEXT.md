# Order Tracker Minimal Context

Use this file as the primary context. Read additional files only if the task touches them.

## What This Repo Is

Small DevOps/portfolio project with:

- `services/order-api`: Express API for CRUD-ish order actions, in-memory only
- `services/alerting-service`: Express API that stores alerts in memory
- `services/frontend`: CRA React app served by nginx, polls both APIs
- `k8s/`: Kubernetes base + Kustomize overlays for `dev` and `staging`
- `k8s/argocd/applicationset.yaml`: ArgoCD ApplicationSet that deploys overlays
- `infra/terraform/`: AWS infra for VPC + EKS + ECR, with S3/DynamoDB remote state
- `.github/workflows/`: CI/CD for image build/push and cluster create/destroy

## Runtime Architecture

Flow:

1. Frontend calls `order-api` via `/api/orders/*`
2. `order-api` stores orders in process memory
3. `order-api` POSTs to `alerting-service`
4. `alerting-service` stores alerts in process memory
5. Frontend polls health/orders/alerts every 5-10s

Important:

- No database yet
- No auth
- No tests of substance
- State is lost on pod restart
- APIs are simple single-file services

## Most Important Files

- `services/order-api/index.js`
- `services/alerting-service/index.js`
- `services/frontend/src/App.js`
- `services/frontend/src/components/*`
- `services/frontend/src/hooks/usePolling.js`
- `services/frontend/docker-entrypoint.sh`
- `services/frontend/nginx.conf.template`
- `k8s/base/*`
- `k8s/overlays/*/kustomization.yaml`
- `k8s/argocd/applicationset.yaml`
- `infra/terraform/README.md`
- `infra/terraform/*.tf`
- `.github/workflows/*.yml`

## Service Details

### `order-api`

- Express 5, CommonJS
- Port `3000`
- Endpoints:
  - `GET /health`
  - `GET /orders`
  - `POST /orders`
  - `DELETE /orders/:id`
- Uses env vars:
  - `SERVICE_NAME`
  - `ENVIRONMENT`
  - `PORT`
  - `ALERTING_SERVICE_URL`
- Uses global `fetch` from Node 24 image
- Comment says Postgres/Dapr are future phases, not implemented

### `alerting-service`

- Express 5, CommonJS
- Port `3001`
- Endpoints:
  - `GET /health`
  - `GET /alerts`
  - `POST /alerts`
- Uses env vars:
  - `SERVICE_NAME`
  - `ENVIRONMENT`
  - `PORT`

### `frontend`

- CRA + React 19 + Tailwind
- Dev proxy in `src/setupProxy.js`
- Production served by nginx in container
- Runtime env injection via `docker-entrypoint.sh` writing `env-config.js`
- Frontend env banner reads `window._env_.REACT_APP_ENVIRONMENT`
- nginx proxies:
  - `/api/orders/` -> `${ORDER_API_URL}`
  - `/api/alerts/` -> `${ALERTING_SERVICE_URL}`

## Kubernetes Model

Base manifests define 3 deployments + 3 services.

Overlays:

- `dev`: namespace `dev`, frontend `LoadBalancer`, order-api replicas `2`
- `staging`: namespace `staging`, frontend `LoadBalancer`

Config is injected by ConfigMaps, mainly:

- backend service URLs
- `ENVIRONMENT`
- `REACT_APP_ENVIRONMENT`

Image tags are pinned in each overlay `kustomization.yaml` and updated by GitHub Actions.

## ArgoCD Behavior

`k8s/argocd/applicationset.yaml` watches:

- `k8s/overlays/dev`
- `k8s/overlays/staging`

## Terraform Model

Terraform manages platform only, not app manifests.

Creates:

- VPC via `terraform-aws-modules/vpc/aws`
- EKS via `terraform-aws-modules/eks/aws`
- ECR repos for 3 services
- Remote state backend is bootstrapped separately in `infra/terraform/bootstrap`

Key defaults:

- Region: `us-east-2`
- Cluster name: `k8s-learning`
- K8s version: `1.30`
- Node group: `t3.medium`, desired `2`
- Single NAT gateway
- Public EKS endpoint enabled

Remote state:

- S3 backend configured in `infra/terraform/backend.tf`
- bucket/table values injected at `terraform init`

## GitHub Actions Model

### Main workflows

- `build-push-ecr.yml`
  - On `main` push
  - Builds/pushes all 3 images to ECR
  - Rewrites image tags in `k8s/overlays/dev` and `staging`
  - Commits back to repo
- `create-cluster.yml`
  - Manual
  - Runs Terraform apply
  - Installs ArgoCD
  - Applies ApplicationSet
- `destroy-cluster.yml`
  - Manual
  - Deletes cluster-managed ELBs first, then Terraform destroy
- `terraform-plan.yml`
  - PRs touching `infra/terraform/**`

Notable inconsistency:

- `build-push-ecr.yml` uses static AWS access keys
- Terraform/cluster workflows use OIDC role assumption

## Current Project Constraints / Risks

- No persistence; all orders/alerts are in-memory
- No backend tests
- Frontend tests are default CRA deps only; no meaningful coverage found
- CI mutates tracked manifests on `main`
- Some workflow auth/config patterns are inconsistent

## If You Need To Change Something

Use these file groups:

- API behavior: `services/order-api/index.js`, `services/alerting-service/index.js`
- Frontend UI/data flow: `services/frontend/src/components/*`, `App.js`, `usePolling.js`
- Frontend runtime/env/proxy: `src/setupProxy.js`, `docker-entrypoint.sh`, `nginx.conf.template`
- Deploy behavior: `k8s/base/*`, `k8s/overlays/*`
- ArgoCD env discovery: `k8s/argocd/applicationset.yaml`
- AWS infra: `infra/terraform/*.tf`
- CI/CD automation: `.github/workflows/*.yml`

## Suggested Low-Token Working Rules

For Claude Code:

- Start from this file, not full-repo ingestion
- Only open files in the area related to the task
- Assume this is a learning project with intentionally simple services
- Do not search for DB/auth layers unless task mentions adding them
- Check workflows/manifests when changing image tags, env names, or cluster behavior
- Check Terraform only for infra/platform tasks

## Fast Mental Model

- App code is simple
- Deployment logic is where most complexity lives
- Infra recently moved from `eksctl` style to Terraform
- Environment promotion is mostly GitOps via Kustomize + ArgoCD + workflow-driven tag updates
