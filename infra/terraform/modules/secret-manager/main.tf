locals {
  secrets = [
    "database-url",
    "firebase-admin-sdk",
    "asaas-api-key",
    "sentry-dsn",
    "jwt-secret",
    "playwright-test-email",
    "playwright-test-password",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secrets)
  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  labels = {
    managed_by  = "terraform"
    environment = var.environment
  }
}
