resource "google_sql_database_instance" "postgres" {
  name             = "draftklub-postgres"
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_17"

  settings {
    tier              = var.tier
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"
    edition           = var.edition

    disk_autoresize       = true
    disk_autoresize_limit = var.disk_autoresize_limit_gb
    disk_size             = var.disk_size_gb
    disk_type             = "PD_SSD"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.pitr_enabled
      transaction_log_retention_days = var.log_retention_days
      backup_retention_settings {
        retained_backups = var.backup_retention_count
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    database_flags {
      name  = "max_connections"
      value = var.max_connections
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    database_flags {
      name  = "pg_stat_statements.track"
      value = "all"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }

  deletion_protection = var.deletion_protection

  depends_on = [var.private_vpc_connection]
}

resource "google_sql_database" "draftklub" {
  name     = "draftklub"
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "api" {
  name     = "api"
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  password = var.api_db_password
}
