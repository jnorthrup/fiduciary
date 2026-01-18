module "vpc" {
  source     = "../../modules/vpc"
  project_id = var.project_id
  region     = var.region
}

module "gke" {
  source     = "../../modules/gke"
  project_id = var.project_id
  region     = var.region
  network    = module.vpc.vpc_id
  subnetwork = module.vpc.subnet_id
}

module "registry" {
  source     = "../../modules/registry"
  project_id = var.project_id
  region     = var.region
}

module "pubsub" {
  source     = "../../modules/pubsub"
  project_id = var.project_id
}

module "workload_identity" {
  source     = "../../modules/workload_identity"
  project_id = var.project_id
}
