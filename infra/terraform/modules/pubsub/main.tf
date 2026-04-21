locals {
  topics = {
    "identity-events"     = { retention_days = 7 }
    "klub-events"         = { retention_days = 7 }
    "booking-events"      = { retention_days = 7 }
    "payment-events"      = { retention_days = 14 }
    "competition-events"  = { retention_days = 7 }
    "notification-events" = { retention_days = 3 }
    "outbox-events"       = { retention_days = 7 }
  }
}

resource "google_pubsub_topic" "topics" {
  for_each = local.topics

  name    = each.key
  project = var.project_id

  message_retention_duration = "${each.value.retention_days * 24 * 60 * 60}s"

  labels = {
    managed_by  = "terraform"
    environment = var.environment
  }
}

resource "google_pubsub_subscription" "worker_subscriptions" {
  for_each = local.topics

  name    = "${each.key}-worker-sub"
  project = var.project_id
  topic   = google_pubsub_topic.topics[each.key].name

  ack_deadline_seconds       = 60
  message_retention_duration = "${each.value.retention_days * 24 * 60 * 60}s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = ""
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_topic" "dead_letter" {
  name    = "dead-letter"
  project = var.project_id

  message_retention_duration = "${7 * 24 * 60 * 60}s"

  labels = {
    managed_by  = "terraform"
    environment = var.environment
  }
}
