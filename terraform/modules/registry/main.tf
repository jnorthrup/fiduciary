variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "repository_id" {
  description = "The repository ID for the registry"
  type        = string
  default     = "ledger-registry"
}

resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = var.repository_id
  description   = "Docker repository for ledger PWA and microservices"
  format        = "DOCKER"
  project       = var.project_id
}
