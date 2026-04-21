locals {
  node_env = {
    "dev"     = "development"
    "staging" = "staging"
    "prod"    = "production"
  }
}

resource "google_cloud_run_v2_service" "api" {
  name     = "draftklub-api"
  project  = var.project_id
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.api_sa_email

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      resources {
        limits = {
          cpu    = var.api_cpu
          memory = var.api_memory
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = lookup(local.node_env, var.environment, var.environment)
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 30
        failure_threshold     = 3
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "draftklub-worker"
  project  = var.project_id
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.worker_sa_email

    scaling {
      min_instance_count = var.worker_min_instances
      max_instance_count = var.worker_max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      resources {
        limits = {
          cpu    = var.worker_cpu
          memory = var.worker_memory
        }
        cpu_idle = false
      }

      env {
        name  = "NODE_ENV"
        value = lookup(local.node_env, var.environment, var.environment)
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

