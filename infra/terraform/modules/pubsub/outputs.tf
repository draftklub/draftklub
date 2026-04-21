output "topic_names" {
  value = { for k, v in google_pubsub_topic.topics : k => v.name }
}
output "dead_letter_topic" {
  value = google_pubsub_topic.dead_letter.name
}
