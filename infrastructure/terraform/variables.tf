# Variables for Axis Imaging infrastructure

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "axis-imaging"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

variable "primary_region" {
  description = "Primary AWS region (Sydney for Australian healthcare compliance)"
  type        = string
  default     = "ap-southeast-2"
}

variable "secondary_region" {
  description = "Secondary AWS region for disaster recovery (Melbourne)"
  type        = string
  default     = "ap-southeast-4"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (application tier)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.r6g.xlarge"  # 4 vCPU, 32GB RAM for healthcare workloads
}

variable "db_allocated_storage" {
  description = "Initial storage for RDS instance in GB"
  type        = number
  default     = 500
}

variable "db_max_allocated_storage" {
  description = "Maximum storage for RDS autoscaling in GB"
  type        = number
  default     = 2000
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days (healthcare compliance)"
  type        = number
  default     = 2555  # 7 years for healthcare records
}

variable "db_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"  # Low usage hours for Australian timezone
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "Sun:04:00-Sun:05:00"  # Sunday early morning Australian time
}

# ECS Configuration
variable "ecs_cpu" {
  description = "CPU units for ECS tasks"
  type        = number
  default     = 1024  # 1 vCPU
}

variable "ecs_memory" {
  description = "Memory for ECS tasks in MB"
  type        = number
  default     = 2048  # 2GB
}

variable "backend_desired_count" {
  description = "Desired number of backend service instances"
  type        = number
  default     = 2
}

variable "backend_min_capacity" {
  description = "Minimum number of backend service instances"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum number of backend service instances"
  type        = number
  default     = 10
}

variable "frontend_desired_count" {
  description = "Desired number of frontend service instances"
  type        = number
  default     = 2
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache node type for Redis"
  type        = string
  default     = "cache.r7g.large"  # 2 vCPU, 13.07GB RAM
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes for Redis cluster"
  type        = number
  default     = 2
}

# Auto Scaling Configuration
variable "cpu_scale_up_threshold" {
  description = "CPU utilization threshold for scaling up"
  type        = number
  default     = 70
}

variable "cpu_scale_down_threshold" {
  description = "CPU utilization threshold for scaling down"
  type        = number
  default     = 30
}

variable "memory_scale_up_threshold" {
  description = "Memory utilization threshold for scaling up"
  type        = number
  default     = 80
}

# Domain and SSL
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "portal.axisimaging.com.au"
}

variable "subdomain_api" {
  description = "API subdomain"
  type        = string
  default     = "api"
}

variable "subdomain_monitoring" {
  description = "Monitoring subdomain"
  type        = string
  default     = "monitoring"
}

# Compliance and Security
variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all storage"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs for security monitoring"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_schedule" {
  description = "Cron schedule for automated backups"
  type        = string
  default     = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 2555  # 7 years for healthcare compliance
}

variable "cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = true
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 2555  # 7 years for healthcare audit logs
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention" {
  description = "Performance Insights data retention period"
  type        = number
  default     = 731  # 2 years
}

# Cost Management
variable "enable_cost_allocation_tags" {
  description = "Enable detailed cost allocation tags"
  type        = bool
  default     = true
}

variable "budget_limit" {
  description = "Monthly budget limit in AUD"
  type        = number
  default     = 5000
}

# Healthcare Compliance Tags
variable "data_classification" {
  description = "Data classification level"
  type        = string
  default     = "Healthcare-PII"
}

variable "compliance_framework" {
  description = "Compliance framework"
  type        = string
  default     = "Privacy-Act-1988"
}

variable "data_sovereignty" {
  description = "Data sovereignty requirement"
  type        = string
  default     = "Australia"
}