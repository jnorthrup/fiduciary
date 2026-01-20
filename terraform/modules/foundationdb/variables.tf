variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "cluster_name" {
  description = "Name of the FoundationDB cluster"
  type        = string
  default     = "foundationdb"
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "network_id" {
  description = "VPC Network ID"
  type        = string
}

variable "subnetwork_id" {
  description = "Subnetwork ID"
  type        = string
}

variable "pods_ip_range_name" {
  description = "Secondary IP range for Pods"
  type        = string
}

variable "services_ip_range_name" {
  description = "Secondary IP range for Services"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "default"
}

variable "fdb_version" {
  description = "FoundationDB version"
  type        = string
  default     = "7.3.27"
}

variable "replication_factor" {
  description = "FoundationDB replication factor"
  type        = number
  default     = 2
  validation {
    condition     = contains([1, 2, 3], var.replication_factor)
    error_message = "Replication factor must be 1, 2, or 3."
  }
}

variable "storage_class" {
  description = "Kubernetes StorageClass"
  type        = string
  default     = "standard-rwo"
}

variable "storage_size" {
  description = "Storage size per instance"
  type        = string
  default     = "100Gi"
}

variable "coordinator_count" {
  description = "Number of coordinator processes"
  type        = number
  default     = 3
  validation {
    condition     = var.coordinator_count > 0 && var.coordinator_count % 2 == 1
    error_message = "Coordinator count must be a positive odd number."
  }
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

variable "storage_roles" {
  description = "IAM roles for storage access (backups)"
  type        = list(string)
  default     = ["roles/storage.objectAdmin"]
}
