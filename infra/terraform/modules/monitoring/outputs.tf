output "notification_channel_id" {
  description = "ID do canal email — pode ser referenciado em alert policies adicionais."
  value       = google_monitoring_notification_channel.email.id
}

output "uptime_check_api_id" {
  value = google_monitoring_uptime_check_config.api.uptime_check_id
}

output "uptime_check_web_id" {
  description = "Pode ser null quando web_uptime_host vazio."
  value       = try(google_monitoring_uptime_check_config.web[0].uptime_check_id, null)
}
