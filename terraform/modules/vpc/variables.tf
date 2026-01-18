variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "network_name" {
  description = "The name of the VPC network"
  type        = string
  default     = "ledger-vpc"
}

variable "subnet_cidr" {
  description = "The CIDR range for the primary subnet"
  type        = string
  default     = "10.0.0.0/24"
}
