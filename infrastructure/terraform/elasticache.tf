# ElastiCache Redis for Session Storage and Caching
# Multi-AZ deployment with encryption for healthcare compliance

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name = "${var.project_name}-cache-subnet-group-${var.environment}"
  }
}

# Parameter Group for Redis optimization
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${var.project_name}-redis-params-${var.environment}"
  
  # Healthcare-specific Redis parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys when memory full
  }
  
  parameter {
    name  = "timeout"
    value = "300"  # 5 minute timeout for idle connections
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "60"  # Keep-alive for better connection management
  }
  
  parameter {
    name  = "maxclients"
    value = "20000"  # Maximum number of connected clients
  }
  
  tags = {
    Name = "${var.project_name}-redis-params-${var.environment}"
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${var.project_name}-redis-${var.environment}"
  description                  = "Redis cluster for Axis Imaging ${var.environment}"
  
  # Node Configuration
  node_type                   = var.redis_node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  
  # Cluster Configuration
  num_cache_clusters         = var.redis_num_cache_nodes
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Network Configuration
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security Configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  kms_key_id                = aws_kms_key.elasticache.arn
  
  # Backup Configuration (Healthcare Compliance)
  snapshot_retention_limit = 7    # 7 days of snapshots
  snapshot_window         = "03:00-05:00"  # Low usage hours
  maintenance_window      = "sun:05:00-sun:07:00"
  
  # Automatic backup to S3
  final_snapshot_identifier = "${var.project_name}-redis-final-snapshot-${var.environment}"
  
  # Monitoring
  auto_minor_version_upgrade = false  # Manual upgrades for healthcare systems
  
  # Log Configuration
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  tags = {
    Name = "${var.project_name}-redis-cluster-${var.environment}"
    BackupRequired = "true"
  }
  
  lifecycle {
    ignore_changes = [
      auth_token,
      final_snapshot_identifier,
    ]
  }
}

# Random password for Redis authentication
resource "random_password" "redis_auth" {
  length  = 64
  special = false  # Redis auth tokens don't support special characters
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name                    = "${var.project_name}/redis/auth-token/${var.environment}"
  description             = "Redis authentication token for Axis Imaging ${var.environment}"
  recovery_window_in_days = 30
  kms_key_id             = aws_kms_key.secrets.arn
  
  tags = {
    Name = "${var.project_name}-redis-auth-secret-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    host       = aws_elasticache_replication_group.main.configuration_endpoint_address
    port       = aws_elasticache_replication_group.main.port
  })
}

# KMS Key for ElastiCache encryption
resource "aws_kms_key" "elasticache" {
  description             = "KMS key for ElastiCache encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-elasticache-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "elasticache" {
  name          = "alias/${var.project_name}-elasticache-${var.environment}"
  target_key_id = aws_kms_key.elasticache.key_id
}

# CloudWatch Log Group for Redis slow queries
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.project_name}-${var.environment}/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.logs.arn
  
  tags = {
    Name = "${var.project_name}-redis-slow-log-${var.environment}"
  }
}

# CloudWatch Alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-redis-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.replication_group_id
  }
  
  tags = {
    Name = "${var.project_name}-redis-high-cpu-alarm-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-redis-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.replication_group_id
  }
  
  tags = {
    Name = "${var.project_name}-redis-high-memory-alarm-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${var.project_name}-redis-high-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"  # Alert if more than 100 concurrent connections
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.replication_group_id
  }
  
  tags = {
    Name = "${var.project_name}-redis-high-connections-alarm-${var.environment}"
  }
}

# ElastiCache for Redis in DR region
resource "aws_elasticache_subnet_group" "dr" {
  provider   = aws.disaster_recovery
  name       = "${var.project_name}-cache-subnet-group-dr-${var.environment}"
  subnet_ids = aws_subnet.private_dr[*].id
  
  tags = {
    Name = "${var.project_name}-cache-subnet-group-dr-${var.environment}"
  }
}

resource "aws_elasticache_parameter_group" "dr" {
  provider = aws.disaster_recovery
  family   = "redis7.x"
  name     = "${var.project_name}-redis-params-dr-${var.environment}"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  tags = {
    Name = "${var.project_name}-redis-params-dr-${var.environment}"
  }
}

# Redis cluster in DR region (standby)
resource "aws_elasticache_replication_group" "dr" {
  provider             = aws.disaster_recovery
  replication_group_id = "${var.project_name}-redis-dr-${var.environment}"
  description          = "Redis DR cluster for Axis Imaging ${var.environment}"
  
  node_type                   = var.redis_node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.dr.name
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name  = aws_elasticache_subnet_group.dr.name
  security_group_ids = [aws_security_group.redis_dr.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  kms_key_id                = aws_kms_key.elasticache_dr.arn
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  auto_minor_version_upgrade = false
  
  tags = {
    Name = "${var.project_name}-redis-cluster-dr-${var.environment}"
    Role = "DisasterRecovery"
  }
}

resource "aws_kms_key" "elasticache_dr" {
  provider                = aws.disaster_recovery
  description             = "KMS key for ElastiCache DR encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-elasticache-dr-kms-${var.environment}"
  }
}

# Security group for DR Redis
resource "aws_security_group" "redis_dr" {
  provider    = aws.disaster_recovery
  name_prefix = "${var.project_name}-redis-dr-"
  vpc_id      = aws_vpc.dr.id
  description = "Security group for Redis ElastiCache DR"
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  tags = {
    Name = "${var.project_name}-redis-dr-sg-${var.environment}"
  }
  
  lifecycle {
    create_before_destroy = true
  }
}