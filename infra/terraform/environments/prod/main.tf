provider "google" {
  impersonate_service_account = var.terraform_sa_email
  region                      = var.region
}

provider "google-beta" {
  impersonate_service_account = var.terraform_sa_email
  region                      = var.region
}

locals {
  environment = "prod"
  project_id  = "draftklub-prod"
}

module "project" {
  source = "../../modules/project"

  project_id         = local.project_id
  display_name       = "DraftKlub Prod"
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
  connector_machine_type = "e2-standard-4"
  apis_ready             = module.project.project_number

  depends_on = [module.project]
}

module "iam" {
  source           = "../../modules/iam"
  project_id       = local.project_id
  admin_user_email = "admin@draftklub.com"
  depends_on       = [module.project]
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id               = local.project_id
  region                   = var.region
  vpc_network_id           = module.vpc.network_id
  private_vpc_connection   = module.vpc.private_vpc_connection
  edition                  = "ENTERPRISE_PLUS"
  tier                     = "db-custom-2-7680"
  high_availability        = true
  disk_size_gb             = 20
  disk_autoresize_limit_gb = 500
  pitr_enabled             = true
  log_retention_days       = 7
  backup_retention_count   = 30
  max_connections          = "200"
  deletion_protection      = true
  api_db_password          = var.api_db_password

  depends_on = [module.vpc]
}

module "firestore" {
  source = "../../modules/firestore"

  project_id        = local.project_id
  region            = var.region
  delete_protection = true
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

  api_min_instances    = 1
  api_max_instances    = 10
  api_cpu              = "1"
  api_memory           = "1Gi"
  worker_min_instances = 1
  worker_max_instances = 5
  worker_cpu           = "1"
  worker_memory        = "1Gi"

  depends_on = [module.vpc, module.iam]
}
