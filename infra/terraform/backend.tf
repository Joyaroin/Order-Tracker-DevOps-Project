# Remote state is stored in S3 with DynamoDB-based locking.
# The bucket and table are created by the ./bootstrap module — see README.md.
#
# The bucket name is injected at init time via `-backend-config` so the repo
# does not need to hard-code a globally unique name. Example:
#
#   terraform init \
#     -backend-config="bucket=order-tracker-tf-state-<account-id>" \
#     -backend-config="key=order-tracker/terraform.tfstate" \
#     -backend-config="region=us-east-2" \
#     -backend-config="dynamodb_table=order-tracker-tf-locks" \
#     -backend-config="encrypt=true"

terraform {
  backend "s3" {}
}
