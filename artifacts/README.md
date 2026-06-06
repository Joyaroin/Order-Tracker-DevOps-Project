# Artifacts

Human-readable view of which artifact (container image tag) each environment
is currently running.

The **source of truth** is still the Kustomize overlay (`k8s/overlays/<env>/kustomization.yaml`)
— that's what ArgoCD applies. The files here mirror that information in one
place so you can answer "what's in dev right now?" without digging through
manifests.

## Files

- `dev.yaml`     — what's deployed to the dev namespace
- `staging.yaml` — what's deployed to the staging namespace

## Keeping it in sync

The current image tags are written into:

- `k8s/overlays/dev/kustomization.yaml`     (CI updates this on every push to main)
- `k8s/overlays/staging/kustomization.yaml` (manual promotion or CI)

Run `./artifacts/refresh.sh` to regenerate the YAMLs in this folder from those
overlays. It does not change deployment state — it just reads.

## What's an "artifact" here?

Each row is one container image, identified by:

- **service**    — which app it is (order-api, alerting-service, frontend)
- **repository** — full ECR path (registry + repo)
- **tag**        — Git commit SHA the image was built from
- **ref**        — `registry/repo:tag` — what k8s actually pulls
