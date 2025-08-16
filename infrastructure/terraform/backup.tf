# Comprehensive Backup and Disaster Recovery for Healthcare Data
# 7-year retention for compliance with Australian healthcare regulations

# AWS Backup Vault with encryption
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-backup-vault-${var.environment}"
  kms_key_arn = aws_kms_key.backup.arn
  
  tags = {
    Name = "${var.project_name}-backup-vault-${var.environment}"
    DataClassification = "Healthcare-PHI"
    Compliance = "Privacy-Act-1988"
  }
}

# Cross-region backup vault for disaster recovery
resource "aws_backup_vault" "dr" {
  provider    = aws.disaster_recovery
  name        = "${var.project_name}-backup-vault-dr-${var.environment}"
  kms_key_arn = aws_kms_key.backup_dr.arn
  
  tags = {
    Name = "${var.project_name}-backup-vault-dr-${var.environment}"
    DataClassification = "Healthcare-PHI"
    Purpose = "Disaster-Recovery"
  }
}

# KMS Keys for backup encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableBackupService"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      },
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-backup-kms-${var.environment}"
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.project_name}-backup-${var.environment}"
  target_key_id = aws_kms_key.backup.key_id
}

resource "aws_kms_key" "backup_dr" {
  provider                = aws.disaster_recovery
  description             = "KMS key for backup DR encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableBackupService"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      },
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-backup-dr-kms-${var.environment}"
  }
}

# IAM role for AWS Backup service
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-backup-role-${var.environment}"
  }
}

# Attach AWS managed policies for backup
resource "aws_iam_role_policy_attachment" "backup_policy" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore_policy" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Custom policy for EFS and S3 backups
resource "aws_iam_role_policy" "backup_custom" {
  name = "${var.project_name}-backup-custom-policy-${var.environment}"
  role = aws_iam_role.backup.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "s3:ListBucket",
          "s3:ListBucketVersions",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*",
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:DescribeFileSystems",
          "elasticfilesystem:DescribeMountTargets"
        ]
        Resource = "*"
      }
    ]
  })
}

# Healthcare-compliant backup plan (7-year retention)
resource "aws_backup_plan" "healthcare" {
  name = "${var.project_name}-healthcare-backup-${var.environment}"
  
  # Daily backups with 7-year retention
  rule {
    rule_name         = "healthcare_daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM daily
    start_window      = 60                   # Start within 1 hour
    completion_window = 300                  # Complete within 5 hours
    
    lifecycle {
      cold_storage_after = 90   # Move to cold storage after 90 days
      delete_after      = 2555  # 7 years retention (2555 days)
    }
    
    recovery_point_tags = {
      BackupType = "Daily"
      Compliance = "Privacy-Act-1988"
      Environment = var.environment
    }
    
    # Cross-region copy for disaster recovery
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn
      
      lifecycle {
        cold_storage_after = 90
        delete_after      = 2555
      }
    }
  }
  
  # Weekly backups for long-term storage
  rule {
    rule_name         = "healthcare_weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # 3 AM every Sunday
    start_window      = 60
    completion_window = 480  # 8 hours for weekly backups
    
    lifecycle {
      cold_storage_after = 30   # Immediate cold storage for weekly
      delete_after      = 2555
    }
    
    recovery_point_tags = {
      BackupType = "Weekly"
      Compliance = "Privacy-Act-1988"
      Environment = var.environment
    }
    
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn
      
      lifecycle {
        cold_storage_after = 30
        delete_after      = 2555
      }
    }
  }
  
  # Monthly backups for compliance archival
  rule {
    rule_name         = "healthcare_monthly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 1 * ? *)"  # 4 AM on 1st of each month
    start_window      = 60
    completion_window = 600  # 10 hours for monthly backups
    
    lifecycle {
      cold_storage_after = 1    # Immediate cold storage
      delete_after      = 2555
    }
    
    recovery_point_tags = {
      BackupType = "Monthly"
      Compliance = "Privacy-Act-1988"
      Environment = var.environment
      Archive = "Long-Term"
    }
    
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn
      
      lifecycle {
        cold_storage_after = 1
        delete_after      = 2555
      }
    }
  }
  
  tags = {
    Name = "${var.project_name}-healthcare-backup-plan-${var.environment}"
    Compliance = "Privacy-Act-1988"
  }
}

# Backup selection for healthcare resources
resource "aws_backup_selection" "healthcare" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-healthcare-selection-${var.environment}"
  plan_id      = aws_backup_plan.healthcare.id
  
  # Include all tagged healthcare resources
  condition {
    string_equals {
      key   = "BackupRequired"
      value = "true"
    }
  }
  
  condition {
    string_equals {
      key   = "Environment"
      value = var.environment
    }
  }
  
  # Specific resource ARNs for critical healthcare data
  resources = [
    aws_db_instance.main.arn,
    aws_db_instance.read_replica.arn,
    aws_efs_file_system.audit_logs.arn,
    aws_s3_bucket.uploads.arn
  ]
}

# Point-in-time recovery backup for critical database
resource "aws_backup_selection" "database_pitr" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-database-pitr-${var.environment}"
  plan_id      = aws_backup_plan.database_pitr.id
  
  resources = [
    aws_db_instance.main.arn
  ]
}

resource "aws_backup_plan" "database_pitr" {
  name = "${var.project_name}-database-pitr-${var.environment}"
  
  # Continuous backup for point-in-time recovery
  rule {
    rule_name         = "database_continuous_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 */6 * * ? *)"  # Every 6 hours
    start_window      = 30
    completion_window = 120
    
    lifecycle {
      delete_after = 35  # 35 days for PITR
    }
    
    recovery_point_tags = {
      BackupType = "Continuous"
      Purpose = "Point-In-Time-Recovery"
    }
    
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn
      
      lifecycle {
        delete_after = 35
      }
    }
  }
  
  tags = {
    Name = "${var.project_name}-database-pitr-plan-${var.environment}"
    Purpose = "Point-In-Time-Recovery"
  }
}

# Lambda function for custom backup validation
resource "aws_lambda_function" "backup_validation" {
  filename         = "backup-validation.zip"
  function_name    = "${var.project_name}-backup-validation-${var.environment}"
  role            = aws_iam_role.backup_lambda.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 300
  
  environment {
    variables = {
      BACKUP_VAULT_NAME = aws_backup_vault.main.name
      SNS_TOPIC_ARN    = aws_sns_topic.backup_alerts.arn
    }
  }
  
  tags = {
    Name = "${var.project_name}-backup-validation-${var.environment}"
  }
}

# IAM role for backup validation Lambda
resource "aws_iam_role" "backup_lambda" {
  name = "${var.project_name}-backup-lambda-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_lambda_basic" {
  role       = aws_iam_role.backup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "backup_lambda_custom" {
  name = "${var.project_name}-backup-lambda-policy-${var.environment}"
  role = aws_iam_role.backup_lambda.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "backup:DescribeBackupJob",
          "backup:ListBackupJobs",
          "backup:DescribeRecoveryPoint",
          "backup:ListRecoveryPoints"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.backup_alerts.arn
      }
    ]
  })
}

# SNS topic for backup alerts
resource "aws_sns_topic" "backup_alerts" {
  name         = "${var.project_name}-backup-alerts-${var.environment}"
  display_name = "Axis Imaging Backup Alerts"
  
  kms_master_key_id = aws_kms_key.sns.arn
  
  tags = {
    Name = "${var.project_name}-backup-alerts-${var.environment}"
  }
}

# EventBridge rule for backup job state changes
resource "aws_cloudwatch_event_rule" "backup_events" {
  name        = "${var.project_name}-backup-events-${var.environment}"
  description = "Capture backup job state changes"
  
  event_pattern = jsonencode({
    source      = ["aws.backup"]
    detail-type = ["Backup Job State Change"]
    detail = {
      state = ["FAILED", "COMPLETED", "ABORTED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_lambda" {
  rule      = aws_cloudwatch_event_rule.backup_events.name
  target_id = "BackupValidationTarget"
  arn       = aws_lambda_function.backup_validation.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_validation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_events.arn
}

# CloudWatch alarms for backup monitoring
resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "${var.project_name}-backup-failures-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = "3600"  # 1 hour
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert on any backup job failures"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }
  
  tags = {
    Name = "${var.project_name}-backup-failures-alarm-${var.environment}"
    Severity = "CRITICAL"
  }
}

# Automated disaster recovery testing
resource "aws_lambda_function" "dr_test" {
  filename         = "dr-test.zip"
  function_name    = "${var.project_name}-dr-test-${var.environment}"
  role            = aws_iam_role.dr_test_lambda.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 900  # 15 minutes
  
  environment {
    variables = {
      PRIMARY_REGION    = var.primary_region
      DR_REGION        = var.secondary_region
      PROJECT_NAME     = var.project_name
      ENVIRONMENT      = var.environment
    }
  }
  
  tags = {
    Name = "${var.project_name}-dr-test-${var.environment}"
  }
}

resource "aws_iam_role" "dr_test_lambda" {
  name = "${var.project_name}-dr-test-lambda-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# EventBridge rule for monthly DR tests
resource "aws_cloudwatch_event_rule" "dr_test_schedule" {
  name                = "${var.project_name}-dr-test-schedule-${var.environment}"
  description         = "Monthly disaster recovery test"
  schedule_expression = "cron(0 6 1 * ? *)"  # 6 AM on 1st of each month
}

resource "aws_cloudwatch_event_target" "dr_test_lambda" {
  rule      = aws_cloudwatch_event_rule.dr_test_schedule.name
  target_id = "DRTestTarget"
  arn       = aws_lambda_function.dr_test.arn
}

# Lifecycle policies for long-term archival
resource "aws_s3_bucket_lifecycle_configuration" "backup_archival" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "healthcare_backup_lifecycle"
    status = "Enabled"
    
    # Move backups to different storage classes over time
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    # Keep backups for 7 years (2555 days)
    expiration {
      days = 2555
    }
    
    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}