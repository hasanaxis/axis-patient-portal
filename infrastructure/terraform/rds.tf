# RDS PostgreSQL Database for Axis Imaging
# Australian healthcare compliance with encryption and auditing

# KMS Key for database encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-rds-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-rds-${var.environment}"
  target_key_id = aws_kms_key.rds.key_id
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id
  
  tags = {
    Name = "${var.project_name}-db-subnet-group-${var.environment}"
  }
}

# DB Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-db-params-${var.environment}"
  
  # Healthcare-specific PostgreSQL parameters
  parameter {
    name  = "log_statement"
    value = "all"  # Log all SQL statements for audit compliance
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }
  
  parameter {
    name  = "log_connections"
    value = "1"  # Log all connections
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"  # Log all disconnections
  }
  
  parameter {
    name  = "log_checkpoints"
    value = "1"  # Log checkpoint activity
  }
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"  # Enable query stats and auditing
  }
  
  parameter {
    name  = "pgaudit.log"
    value = "all"  # Audit all database activity
  }
  
  parameter {
    name  = "max_connections"
    value = "200"  # Adjust based on expected load
  }
  
  parameter {
    name  = "work_mem"
    value = "32768"  # 32MB for complex queries
  }
  
  tags = {
    Name = "${var.project_name}-db-params-${var.environment}"
  }
}

# Primary RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-primary-${var.environment}"
  
  # Engine Configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds.arn
  
  # Database Configuration
  db_name  = replace(var.project_name, "-", "_")
  username = "postgres"
  password = random_password.db_password.result
  port     = 5432
  
  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  
  # Parameter and Option Groups
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Backup Configuration (Healthcare Compliance - 7 years)
  backup_retention_period = var.db_backup_retention_period
  backup_window          = var.db_backup_window
  delete_automated_backups = false
  
  # Maintenance
  maintenance_window = var.db_maintenance_window
  auto_minor_version_upgrade = false  # Manual control for healthcare systems
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.performance_insights_retention
  performance_insights_kms_key_id      = aws_kms_key.rds.arn
  
  # Security
  deletion_protection = true  # Prevent accidental deletion
  copy_tags_to_snapshot = true
  
  # Multi-AZ for high availability
  multi_az = true
  
  # Snapshot Configuration
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${var.environment}-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  skip_final_snapshot      = false
  
  tags = {
    Name = "${var.project_name}-primary-db-${var.environment}"
    BackupRequired = "true"
    DataRetention = "7-years"
  }
  
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password,
      final_snapshot_identifier,
    ]
  }
}

# Read Replica for load distribution
resource "aws_db_instance" "read_replica" {
  identifier = "${var.project_name}-read-replica-${var.environment}"
  
  # Replica Configuration
  replicate_source_db = aws_db_instance.main.identifier
  instance_class     = var.db_instance_class
  
  # Network Configuration
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.performance_insights_retention
  performance_insights_kms_key_id      = aws_kms_key.rds.arn
  
  # Security
  copy_tags_to_snapshot = true
  
  # Snapshot Configuration
  final_snapshot_identifier = "${var.project_name}-read-replica-final-snapshot-${var.environment}-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  skip_final_snapshot      = false
  
  tags = {
    Name = "${var.project_name}-read-replica-db-${var.environment}"
    Role = "ReadReplica"
  }
  
  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
    ]
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store database password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/database/password/${var.environment}"
  description             = "Database password for Axis Imaging ${var.environment}"
  recovery_window_in_days = 30
  kms_key_id             = aws_kms_key.secrets.arn
  
  tags = {
    Name = "${var.project_name}-db-secret-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
    read_replica_host = aws_db_instance.read_replica.endpoint
  })
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for PostgreSQL logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${aws_db_instance.main.identifier}/postgresql"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.logs.arn
  
  tags = {
    Name = "${var.project_name}-postgresql-logs-${var.environment}"
  }
}

# Database subnet group for disaster recovery
resource "aws_db_subnet_group" "dr" {
  provider   = aws.disaster_recovery
  name       = "${var.project_name}-db-subnet-group-dr-${var.environment}"
  subnet_ids = aws_subnet.database_dr[*].id
  
  tags = {
    Name = "${var.project_name}-db-subnet-group-dr-${var.environment}"
  }
}

# Cross-region automated backups for disaster recovery
resource "aws_db_instance_automated_backups_replication" "example" {
  source_db_instance_arn = aws_db_instance.main.arn
  destination_region     = var.secondary_region
  kms_key_id            = aws_kms_key.rds_dr.arn
  
  provider = aws.disaster_recovery
}

# KMS key for DR region
resource "aws_kms_key" "rds_dr" {
  provider                = aws.disaster_recovery
  description             = "KMS key for RDS DR encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-rds-dr-kms-${var.environment}"
  }
}