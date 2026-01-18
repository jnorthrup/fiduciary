terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Network
module "vpc" {
  source     = "../../modules/vpc"
  project_id = var.project_id
  region     = var.region
  env_name   = "demo"
}

# Container Registry (Artifact Registry)
module "registry" {
  source     = "../../modules/registry"
  project_id = var.project_id
  location   = var.region
  repo_name  = "trust-ledger-demo"
}

# GKE Cluster
module "gke" {
  source             = "../../modules/gke"
  project_id         = var.project_id
  region             = var.region
  cluster_name       = "trust-ledger-demo"
  network            = module.vpc.network_name
  subnetwork         = module.vpc.subnet_name
  node_count         = 2
  machine_type       = "e2-standard-2" # Cost effective for demo
  preemptible        = true           # Use spot instances to save cost
}

output "cluster_endpoint" {
  value = module.gke.endpoint
}

output "cluster_name" {
  value = module.gke.name
}

output "registry_url" {
  value = module.registry.repository_url
}
