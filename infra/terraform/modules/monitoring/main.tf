/**
 * Sprint M batch 6 — observabilidade reativa.
 *
 * Cobre o gap "outage detectado por screenshot de usuário" da auditoria
 * (P0-11). Cria:
 *
 *  - Notification channel (email único — DL quando time crescer).
 *  - Uptime checks: API /health e Web / (este último opcional via var).
 *  - Alert policies:
 *    1. Uptime check failed (api OU web)
 *    2. API 5xx error rate > threshold (default 1%)
 *    3. API p99 request latency > threshold (default 2s)
 *    4. Cloud SQL connection usage > % do max (default 80%)
 *
 * Sentry (batch 5) cobre exceptions/profiling do código; este módulo
 * cobre infra (saúde do serviço, latência, recursos do DB).
 */

# ─── Notification channel ───────────────────────────────────────────────

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "DraftKlub ${var.environment} alerts (email)"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }

  user_labels = {
    managed_by  = "terraform"
    environment = var.environment
  }
}

# ─── Uptime checks ──────────────────────────────────────────────────────

resource "google_monitoring_uptime_check_config" "api" {
  project      = var.project_id
  display_name = "API health (${var.environment})"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_uptime_host
    }
  }
}

resource "google_monitoring_uptime_check_config" "web" {
  count = var.web_uptime_host == "" ? 0 : 1

  project      = var.project_id
  display_name = "Web home (${var.environment})"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.web_uptime_host
    }
  }
}

# ─── Alert: uptime check failed ─────────────────────────────────────────

resource "google_monitoring_alert_policy" "uptime_failed" {
  project      = var.project_id
  display_name = "Uptime check failed (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Uptime failure"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
      duration        = "120s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "Uptime check do API ou Web falhou em pelo menos uma das regiões de probe. Verifique status do Cloud Run em https://console.cloud.google.com/run e logs recentes."
    mime_type = "text/markdown"
  }

  user_labels = {
    managed_by  = "terraform"
    environment = var.environment
    severity    = "critical"
  }
}

# ─── Alert: API 5xx error rate ──────────────────────────────────────────

resource "google_monitoring_alert_policy" "api_5xx_rate" {
  project      = var.project_id
  display_name = "API 5xx rate > ${var.api_5xx_rate_threshold * 100}% (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "API 5xx fraction"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.api_5xx_rate_threshold * 100 # absolute count over 5min window

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "API draftklub-api passou de ${var.api_5xx_rate_threshold * 100}% de respostas 5xx em janela de 5 min. Verifique Sentry e logs do Cloud Run."
    mime_type = "text/markdown"
  }

  user_labels = {
    managed_by  = "terraform"
    environment = var.environment
    severity    = "high"
  }
}

# ─── Alert: API p99 latency ─────────────────────────────────────────────

resource "google_monitoring_alert_policy" "api_p99_latency" {
  project      = var.project_id
  display_name = "API p99 latency > ${var.api_p99_latency_ms_threshold}ms (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "API p99 latency"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.api_p99_latency_ms_threshold

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "P99 de latência da API draftklub-api passou de ${var.api_p99_latency_ms_threshold}ms em janela de 5 min. Verifique Cloud Trace e queries Prisma lentas."
    mime_type = "text/markdown"
  }

  user_labels = {
    managed_by  = "terraform"
    environment = var.environment
    severity    = "high"
  }
}

# ─── Alert: Cloud SQL connections ───────────────────────────────────────

resource "google_monitoring_alert_policy" "db_connections" {
  project      = var.project_id
  display_name = "Cloud SQL connections > ${var.db_connections_pct_threshold * 100}% (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "DB connections high"

    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\" AND resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.cloud_sql_database_id}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = floor(var.db_max_connections * var.db_connections_pct_threshold)

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "Cloud SQL passou de ${var.db_connections_pct_threshold * 100}% do limite de conexões (${var.db_max_connections}). Verifique pool Prisma + considerar PgBouncer."
    mime_type = "text/markdown"
  }

  user_labels = {
    managed_by  = "terraform"
    environment = var.environment
    severity    = "high"
  }
}
