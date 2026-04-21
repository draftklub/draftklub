terraform {
  backend "gcs" {
    bucket                      = "draftklub-tf-state"
    prefix                      = "environments/dev"
    impersonate_service_account = "terraform@draftklub-tf-admin.iam.gserviceaccount.com"
  }
}
