# Comprehensive Monitoring and Observability Stack
# CloudWatch, Prometheus, Grafana, and alerting for healthcare compliance

# CloudWatch Dashboard for Application Metrics
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.backend.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            [".", "CPUUtilization", "ServiceName", aws_ecs_service.frontend.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "ECS Service Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "RDS Database Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.main.replication_group_id],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "CurrConnections", ".", "."],
            [".", "CacheMisses", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "ElastiCache Redis Metrics"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Log Insights Queries for Healthcare Compliance
resource "aws_cloudwatch_query_definition" "phi_access_audit" {
  name = "${var.project_name}-phi-access-audit-${var.environment}"
  
  log_group_names = [
    aws_cloudwatch_log_group.backend.name
  ]
  
  query_string = <<EOF
fields @timestamp, userId, patientId, action, resource, ipAddress, success
| filter eventType = "DATA_ACCESS"
| filter patientId like /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
| stats count() by userId, action
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "failed_authentications" {
  name = "${var.project_name}-failed-authentications-${var.environment}"
  
  log_group_names = [
    aws_cloudwatch_log_group.backend.name
  ]
  
  query_string = <<EOF
fields @timestamp, userId, ipAddress, userAgent, event
| filter eventType = "SECURITY" and event = "LOGIN_FAILED"
| stats count() by ipAddress
| sort count desc
EOF
}

resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.project_name}-error-analysis-${var.environment}"
  
  log_group_names = [
    aws_cloudwatch_log_group.backend.name,
    aws_cloudwatch_log_group.frontend.name
  ]
  
  query_string = <<EOF
fields @timestamp, @message, @logStream
| filter @message like /ERROR/ or @message like /error/
| stats count() by @logStream
| sort count desc
EOF
}

# Custom CloudWatch Metrics for Healthcare KPIs
resource "aws_cloudwatch_log_metric_filter" "patient_login_rate" {
  name           = "${var.project_name}-patient-login-rate-${var.environment}"
  pattern        = "[timestamp, requestId, level=\"INFO\", message=\"LOGIN_SUCCESS\", ...]"
  log_group_name = aws_cloudwatch_log_group.backend.name
  
  metric_transformation {
    name          = "PatientLoginRate"
    namespace     = "AxisImaging/Healthcare"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "phi_access_violations" {
  name           = "${var.project_name}-phi-access-violations-${var.environment}"
  pattern        = "[timestamp, requestId, level=\"WARN\", message=\"UNAUTHORIZED_ACCESS\", ...]"
  log_group_name = aws_cloudwatch_log_group.backend.name
  
  metric_transformation {
    name          = "PHIAccessViolations"
    namespace     = "AxisImaging/Security"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "audit_log_failures" {
  name           = "${var.project_name}-audit-log-failures-${var.environment}"
  pattern        = "[timestamp, requestId, level=\"ERROR\", message=\"AUDIT_LOGGING_FAILED\", ...]"
  log_group_name = aws_cloudwatch_log_group.backend.name
  
  metric_transformation {
    name          = "AuditLogFailures"
    namespace     = "AxisImaging/Compliance"
    value         = "1"
    default_value = "0"
  }
}

# Advanced CloudWatch Alarms for Healthcare Compliance
resource "aws_cloudwatch_metric_alarm" "phi_access_violations" {
  alarm_name          = "${var.project_name}-phi-access-violations-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PHIAccessViolations"
  namespace           = "AxisImaging/Security"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert on any PHI access violations"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  
  tags = {
    Name = "${var.project_name}-phi-violations-alarm-${var.environment}"
    Severity = "CRITICAL"
    Compliance = "Privacy-Act-1988"
  }
}

resource "aws_cloudwatch_metric_alarm" "audit_log_failures" {
  alarm_name          = "${var.project_name}-audit-log-failures-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "AuditLogFailures"
  namespace           = "AxisImaging/Compliance"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Critical alert for audit logging failures"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  
  tags = {
    Name = "${var.project_name}-audit-failures-alarm-${var.environment}"
    Severity = "CRITICAL"
    Compliance = "Privacy-Act-1988"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connection_pool" {
  alarm_name          = "${var.project_name}-db-connection-pool-exhaustion-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "180"  # 90% of max connections (200)
  alarm_description   = "Database connection pool near exhaustion"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
  
  tags = {
    Name = "${var.project_name}-db-connection-alarm-${var.environment}"
    Severity = "HIGH"
  }
}

# Security-focused SNS topic
resource "aws_sns_topic" "security_alerts" {
  name         = "${var.project_name}-security-alerts-${var.environment}"
  display_name = "Axis Imaging Security Alerts - ${title(var.environment)}"
  
  kms_master_key_id = aws_kms_key.sns.arn
  
  tags = {
    Name = "${var.project_name}-security-alerts-${var.environment}"
    DataClassification = "Security-Sensitive"
  }
}

resource "aws_kms_key" "sns" {
  description             = "KMS key for SNS encryption - Axis Imaging ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-sns-kms-${var.environment}"
  }
}

# X-Ray Tracing for Request Tracking
resource "aws_xray_sampling_rule" "healthcare_sampling" {
  rule_name      = "${var.project_name}-healthcare-sampling-${var.environment}"
  priority       = 9000
  version        = 1
  reservoir_size = 10
  fixed_rate     = 0.3  # Sample 30% of requests
  
  service_name = "*"
  service_type = "*"
  host         = "*"
  http_method  = "*"
  url_path     = "/api/*"
  
  tags = {
    Name = "${var.project_name}-xray-sampling-${var.environment}"
  }
}

# CloudWatch Composite Alarms for Business Logic
resource "aws_cloudwatch_composite_alarm" "application_health" {
  alarm_name        = "${var.project_name}-application-health-${var.environment}"
  alarm_description = "Overall application health composite alarm"
  
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.backend_high_cpu.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.backend_high_memory.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_5xx_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_response_time.alarm_name})"
  ])
  
  actions_enabled = true
  alarm_actions   = [aws_sns_topic.alerts.arn]
  ok_actions     = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-app-health-alarm-${var.environment}"
  }
}

# CloudWatch Insights for Log Analysis
resource "aws_cloudwatch_log_group" "application_insights" {
  name              = "/aws/application-insights/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.logs.arn
  
  tags = {
    Name = "${var.project_name}-insights-logs-${var.environment}"
  }
}

# EventBridge Rules for Healthcare Compliance Events
resource "aws_cloudwatch_event_rule" "rds_security_events" {
  name        = "${var.project_name}-rds-security-events-${var.environment}"
  description = "Capture RDS security-related events"
  
  event_pattern = jsonencode({
    source        = ["aws.rds"]
    "detail-type" = ["RDS DB Instance Event", "RDS DB Cluster Event"]
    detail = {
      EventCategories = ["security", "failure", "maintenance"]
    }
  })
  
  tags = {
    Name = "${var.project_name}-rds-security-events-${var.environment}"
  }
}

resource "aws_cloudwatch_event_target" "rds_security_sns" {
  rule      = aws_cloudwatch_event_rule.rds_security_events.name
  target_id = "RDSSecurityEventTarget"
  arn       = aws_sns_topic.security_alerts.arn
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
  
  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.logs.arn
  
  tags = {
    Name = "${var.project_name}-waf-logs-${var.environment}"
  }
}

# Custom CloudWatch Metrics for Business KPIs
resource "aws_cloudwatch_log_metric_filter" "successful_appointments" {
  name           = "${var.project_name}-successful-appointments-${var.environment}"
  pattern        = "[timestamp, requestId, level=\"INFO\", message=\"APPOINTMENT_CREATED\", ...]"
  log_group_name = aws_cloudwatch_log_group.backend.name
  
  metric_transformation {
    name          = "SuccessfulAppointments"
    namespace     = "AxisImaging/Business"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "study_uploads" {
  name           = "${var.project_name}-study-uploads-${var.environment}"
  pattern        = "[timestamp, requestId, level=\"INFO\", message=\"STUDY_UPLOADED\", ...]"
  log_group_name = aws_cloudwatch_log_group.backend.name
  
  metric_transformation {
    name          = "StudyUploads"
    namespace     = "AxisImaging/Business"
    value         = "1"
    default_value = "0"
  }
}

# Performance Monitoring Alarms
resource "aws_cloudwatch_metric_alarm" "api_latency_p99" {
  alarm_name          = "${var.project_name}-api-latency-p99-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  
  metric_query {
    id = "m1"
    metric {
      metric_name = "TargetResponseTime"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Average"
      
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
        TargetGroup  = aws_lb_target_group.backend.arn_suffix
      }
    }
  }
  
  threshold         = 1000  # 1 second
  alarm_description = "API latency P99 exceeds threshold"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  
  tags = {
    Name = "${var.project_name}-api-latency-alarm-${var.environment}"
    Severity = "MEDIUM"
  }
}

# Healthcare-specific monitoring for uptime requirements
resource "aws_cloudwatch_metric_alarm" "healthcare_uptime" {
  alarm_name          = "${var.project_name}-healthcare-uptime-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Healthcare system availability below required threshold"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-uptime-alarm-${var.environment}"
    Severity = "CRITICAL"
    Compliance = "Healthcare-Uptime"
  }
}