resource "google_project" "this" {
  name            = var.display_name
  project_id      = var.project_id
  org_id          = var.organization_id
  billing_account = var.billing_account_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    product     = "draftklub"
  }
}

resource "google_project_service" "apis" {
  for_each = toset(var.apis)

  project                    = google_project.this.project_id
  service                    = each.value
  disable_on_destroy         = false
  disable_dependent_services = false

  depends_on = [google_project.this]
}

resource "google_project_iam_binding" "terraform_admin" {
  project = google_project.this.project_id
  role    = "roles/owner"

  members = [
    "serviceAccount:${var.terraform_sa_email}",
  ]

  depends_on = [google_project_service.apis]
}
