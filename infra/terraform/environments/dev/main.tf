provider "google" {
  impersonate_service_account = var.terraform_sa_email
  region                      = var.region
}

provider "google-beta" {
  impersonate_service_account = var.terraform_sa_email
  region                      = var.region
}

locals {
  environment = "dev"
  project_id  = "draftklub-dev"
}

module "project" {
  source = "../../modules/project"

  project_id         = local.project_id
  display_name       = "DraftKlub Dev"
  organization_id    = var.organization_id
  billing_account_id = var.billing_account_id
  environment        = local.environment
  terraform_sa_email = var.terraform_sa_email

  apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "sql-component.googleapis.com",
    "firestore.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudtrace.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
  ]
}

module "vpc" {
  source = "../../modules/vpc"

  project_id             = local.project_id
  region                 = var.region
  subnet_cidr            = "10.0.0.0/24"
  connector_machine_type = "e2-micro"
  apis_ready             = module.project.project_number

  depends_on = [module.project]
}

module "iam" {
  source     = "../../modules/iam"
  project_id = local.project_id
  depends_on = [module.project]
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id               = local.project_id
  region                   = var.region
  vpc_network_id           = module.vpc.network_id
  private_vpc_connection   = module.vpc.private_vpc_connection
  edition                  = "ENTERPRISE"
  tier                     = "db-g1-small"
  high_availability        = false
  disk_size_gb             = 10
  disk_autoresize_limit_gb = 50
  pitr_enabled             = false
  log_retention_days       = 1
  backup_retention_count   = 3
  max_connections          = "50"
  deletion_protection      = false
  api_db_password          = var.api_db_password

  depends_on = [module.vpc]
}

module "firestore" {
  source = "../../modules/firestore"

  project_id        = local.project_id
  region            = var.region
  delete_protection = false
  apis_ready        = module.project.project_number

  depends_on = [module.project]
}

module "pubsub" {
  source = "../../modules/pubsub"

  project_id  = local.project_id
  environment = local.environment

  depends_on = [module.project]
}

module "secret_manager" {
  source = "../../modules/secret-manager"

  project_id  = local.project_id
  environment = local.environment

  depends_on = [module.project]
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id       = local.project_id
  region           = var.region
  environment      = local.environment
  vpc_connector_id = module.vpc.connector_id
  api_sa_email     = module.iam.api_sa_email
  worker_sa_email  = module.iam.worker_sa_email

  api_min_instances    = 0
  api_max_instances    = 3
  api_cpu              = "1"
  api_memory           = "512Mi"
  worker_min_instances = 0
  worker_max_instances = 2
  worker_cpu           = "1"
  worker_memory        = "512Mi"

  depends_on = [module.vpc, module.iam]
}
