output "cluster_name" {
  value = module.gke.cluster_name
}

output "cluster_endpoint" {
  value = module.gke.cluster_endpoint
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "artifact_registry_id" {
  value = module.registry.repository_id
}
