# Storage Services for Axis Imaging
# S3 buckets, EFS for shared storage, and backup solutions

# S3 Bucket for file uploads (medical images, documents)
resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project_name}-uploads-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = false
  
  tags = {
    Name = "${var.project_name}-uploads-${var.environment}"
    DataClassification = "Healthcare-PHI"
    Compliance = "Privacy-Act-1988"
    BackupRequired = "true"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy for uploads bucket
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  
  rule {
    id     = "healthcare_retention"
    status = "Enabled"
    
    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # Move to Deep Archive after 1 year
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    # Delete old versions after 30 days
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    
    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# S3 Bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket        = "${var.project_name}-backups-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = false
  
  tags = {
    Name = "${var.project_name}-backups-${var.environment}"
    DataClassification = "Healthcare-PHI"
    Compliance = "Privacy-Act-1988"
    Purpose = "Backup-and-Recovery"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Cross-region replication for backups
resource "aws_s3_bucket_replication_configuration" "backups" {
  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "backup_replication"
    status = "Enabled"
    
    destination {
      bucket        = aws_s3_bucket.backups_dr.arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.s3_dr.arn
      }
    }
  }
  
  depends_on = [aws_s3_bucket_versioning.backups]
}

# DR region backup bucket
resource "aws_s3_bucket" "backups_dr" {
  provider      = aws.disaster_recovery
  bucket        = "${var.project_name}-backups-dr-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = false
  
  tags = {
    Name = "${var.project_name}-backups-dr-${var.environment}"
    DataClassification = "Healthcare-PHI"
    Purpose = "Disaster-Recovery-Backup"
  }
}

resource "aws_s3_bucket_versioning" "backups_dr" {
  provider = aws.disaster_recovery
  bucket   = aws_s3_bucket.backups_dr.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups_dr" {
  provider = aws.disaster_recovery
  bucket   = aws_s3_bucket.backups_dr.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_dr.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# EFS File System for shared storage (audit logs, temp files)
resource "aws_efs_file_system" "audit_logs" {
  creation_token = "${var.project_name}-audit-logs-${var.environment}"
  
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  provisioned_throughput_in_mibps = 100
  
  encrypted  = true
  kms_key_id = aws_kms_key.efs.arn
  
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
  
  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }
  
  tags = {
    Name = "${var.project_name}-audit-logs-efs-${var.environment}"
    DataClassification = "Healthcare-Audit-Logs"
  }
}

# EFS Mount Targets
resource "aws_efs_mount_target" "audit_logs" {
  count           = length(aws_subnet.private)
  file_system_id  = aws_efs_file_system.audit_logs.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

# EFS Access Point for containers
resource "aws_efs_access_point" "audit_logs" {
  file_system_id = aws_efs_file_system.audit_logs.id
  
  posix_user {
    gid = 1001
    uid = 1001
  }
  
  root_directory {
    path = "/audit-logs"
    creation_info {
      owner_gid   = 1001
      owner_uid   = 1001
      permissions = "755"
    }
  }
  
  tags = {
    Name = "${var.project_name}-audit-logs-access-point-${var.environment}"
  }
}

# Security Group for EFS
resource "aws_security_group" "efs" {
  name_prefix = "${var.project_name}-efs-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for EFS file system"
  
  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  
  tags = {
    Name = "${var.project_name}-efs-sg-${var.environment}"
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# KMS Keys for encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-s3-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.project_name}-s3-${var.environment}"
  target_key_id = aws_kms_key.s3.key_id
}

resource "aws_kms_key" "efs" {
  description             = "KMS key for EFS encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-efs-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "efs" {
  name          = "alias/${var.project_name}-efs-${var.environment}"
  target_key_id = aws_kms_key.efs.key_id
}

resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch logs encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-logs-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "logs" {
  name          = "alias/${var.project_name}-logs-${var.environment}"
  target_key_id = aws_kms_key.logs.key_id
}

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-secrets-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-secrets-${var.environment}"
  target_key_id = aws_kms_key.secrets.key_id
}

# DR region KMS keys
resource "aws_kms_key" "s3_dr" {
  provider                = aws.disaster_recovery
  description             = "KMS key for S3 DR encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-s3-dr-kms-${var.environment}"
  }
}

# IAM role for S3 cross-region replication
resource "aws_iam_role" "s3_replication" {
  name = "${var.project_name}-s3-replication-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_replication" {
  name = "${var.project_name}-s3-replication-policy-${var.environment}"
  role = aws_iam_role.s3_replication.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.backups.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.backups.arn
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.backups_dr.arn}/*"
        ]
      },
      {
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Effect = "Allow"
        Resource = [
          aws_kms_key.s3.arn
        ]
      },
      {
        Action = [
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Effect = "Allow"
        Resource = [
          aws_kms_key.s3_dr.arn
        ]
      }
    ]
  })
}

# Application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/application/secrets/${var.environment}"
  description             = "Application secrets for Axis Imaging ${var.environment}"
  recovery_window_in_days = 30
  kms_key_id             = aws_kms_key.secrets.arn
  
  tags = {
    Name = "${var.project_name}-app-secrets-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    jwt_secret = random_password.jwt_secret.result
    master_encryption_key = random_password.master_encryption_key.result
    audit_encryption_key = random_password.audit_encryption_key.result
    redis_url = "redis://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.configuration_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  })
}

# Random secrets
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "master_encryption_key" {
  length  = 64
  special = true
}

resource "random_password" "audit_encryption_key" {
  length  = 64
  special = true
}