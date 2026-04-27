locals {
  secrets = [
    "database-url",
    "firebase-admin-sdk",
    "asaas-api-key",
    "sentry-dsn",
    "jwt-secret",
    "playwright-test-email",
    "playwright-test-password",
    # Sprint D PR3 — Resend (https://resend.com) pra emails transacionais.
    # Sem valor populado, EmailService cai em log-only mode (não envia).
    # Popular via: gcloud secrets versions add resend-api-key --data-file=-
    "resend-api-key",
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
