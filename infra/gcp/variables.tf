variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region" {
  description = "The GCP region to deploy resources"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "The name of the Cloud Run service"
  type        = string
  default     = "trust-ledger-fullstack"
}

variable "image_url" {
  description = "The container image URL for the dispatch service"
  type        = string
  # Default placeholder - needs to be built and pushed
  default     = "gcr.io/google-samples/hello-app:1.0" 
}
