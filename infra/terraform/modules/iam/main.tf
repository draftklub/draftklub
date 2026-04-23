resource "google_project_iam_member" "admin_owner" {
  count   = var.admin_user_email != "" ? 1 : 0
  project = var.project_id
  role    = "roles/owner"
  member  = "user:${var.admin_user_email}"
}

data "google_project" "project" {
  project_id = var.project_id
}

locals {
  cloudbuild_sa = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
  compute_sa    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = local.cloudbuild_sa
}

resource "google_project_iam_member" "cloudbuild_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = local.cloudbuild_sa
}

resource "google_project_iam_member" "compute_sa_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = local.compute_sa
}

resource "google_project_iam_member" "compute_sa_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = local.compute_sa
}

resource "google_project_iam_member" "compute_sa_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = local.compute_sa
}

resource "google_service_account" "api" {
  account_id   = "draftklub-api"
  display_name = "DraftKlub API"
  description  = "SA usada pelo Cloud Run service api"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "draftklub-worker"
  display_name = "DraftKlub Worker"
  description  = "SA usada pelo Cloud Run service worker (Pub/Sub consumer)"
  project      = var.project_id
}

resource "google_project_iam_member" "api_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_trace" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "worker_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_pubsub_viewer" {
  project = var.project_id
  role    = "roles/pubsub.viewer"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.worker.email}"
}
