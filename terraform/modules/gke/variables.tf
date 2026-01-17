variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "cluster_name" {
  description = "The name of the GKE cluster"
  type        = string
  default     = "ledger-cluster"
}

variable "network" {
  description = "The VPC network ID"
  type        = string
}

variable "subnetwork" {
  description = "The VPC subnetwork ID"
  type        = string
}
