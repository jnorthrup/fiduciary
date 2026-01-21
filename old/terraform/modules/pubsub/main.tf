variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "topics" {
  description = "List of topics to create"
  type        = list(string)
  default     = [
    "ledger.events",
    "build.status",
    "deploy.signal"
  ]
}

resource "google_pubsub_topic" "topics" {
  for_each = toset(var.topics)
  name     = each.value
  project  = var.project_id
}

resource "google_pubsub_subscription" "subscriptions" {
  for_each = toset(var.topics)
  name     = "${each.value}-sub"
  topic    = google_pubsub_topic.topics[each.key].name
  project  = var.project_id

  # Default to pull subscription
  ack_deadline_seconds = 20
}
