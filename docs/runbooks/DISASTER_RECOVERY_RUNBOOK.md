# Disaster Recovery Runbook - Axis Imaging Patient Portal

## Overview

This runbook provides comprehensive procedures for disaster recovery of the Axis Imaging Patient Portal, ensuring business continuity and compliance with Australian healthcare regulations.

## Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Systems**: 4 hours
- **Non-Critical Systems**: 24 hours
- **Full Service**: 8 hours

### RPO (Recovery Point Objective)
- **Database**: 15 minutes (continuous backup)
- **File Storage**: 1 hour
- **Audit Logs**: Real-time replication

## Disaster Scenarios

### Scenario 1: Primary Region Failure (ap-southeast-2)
**Impact**: Complete loss of primary AWS region
**Triggers**: 
- Region-wide AWS outage
- Network partition from primary region
- Complete data center failure

### Scenario 2: Database Failure
**Impact**: Primary database unavailable
**Triggers**:
- RDS instance failure
- Database corruption
- Storage subsystem failure

### Scenario 3: Application Infrastructure Failure
**Impact**: ECS cluster or load balancer failure
**Triggers**:
- ECS service failure
- Load balancer failure
- VPC networking issues

### Scenario 4: Data Breach / Security Incident
**Impact**: Potential data compromise requiring system isolation
**Triggers**:
- Confirmed security breach
- Compliance violation
- Suspicious activity patterns

## Pre-Disaster Preparation

### Environment Setup
```bash
# Set up disaster recovery environment variables
export PRIMARY_REGION=ap-southeast-2
export DR_REGION=ap-southeast-4
export PROJECT_NAME=axis-imaging
export ENVIRONMENT=production
export DR_ENVIRONMENT=production-dr

# Configure AWS CLI for both regions
aws configure set region $PRIMARY_REGION --profile primary
aws configure set region $DR_REGION --profile dr
```

### Verification Checklist
- [ ] DR infrastructure is provisioned and healthy
- [ ] Database replication is active and current
- [ ] Backup systems are functioning
- [ ] DNS failover is configured
- [ ] SSL certificates are valid in DR region
- [ ] Access credentials are available
- [ ] Contact information is current

## Region Failover Procedures

### Phase 1: Assessment and Decision (0-30 minutes)

#### 1.1 Assess Primary Region Status
```bash
# Check primary region service health
aws --profile primary --region $PRIMARY_REGION \
  ecs describe-clusters \
  --clusters axis-imaging-cluster-production

# Test primary endpoints
curl -I --max-time 10 https://api.axisimaging.com.au/health || echo "Primary API unreachable"
curl -I --max-time 10 https://portal.axisimaging.com.au/health || echo "Primary portal unreachable"

# Check RDS status
aws --profile primary --region $PRIMARY_REGION \
  rds describe-db-instances \
  --db-instance-identifier axis-imaging-primary-production
```

#### 1.2 Determine Failover Necessity
**Failover Criteria** (any of the following):
- Primary region unavailable for >30 minutes
- Database unavailable with no ETA for recovery
- Critical security incident requiring isolation
- Executive decision for business continuity

#### 1.3 Initiate Disaster Response
```bash
# Send initial notification
aws --profile dr sns publish \
  --topic-arn arn:aws:sns:$DR_REGION:ACCOUNT:axis-imaging-dr-alerts \
  --subject "DISASTER RECOVERY INITIATED" \
  --message "DR procedure started at $(date). Reason: [SPECIFY_REASON]"

# Create incident ticket
curl -X POST "https://api.pagerduty.com/incidents" \
  -H "Authorization: Token token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "type": "incident",
      "title": "Disaster Recovery - Primary Region Failure",
      "service": {"id": "SERVICE_ID", "type": "service_reference"},
      "urgency": "high"
    }
  }'
```

### Phase 2: Data Recovery (30-120 minutes)

#### 2.1 Assess Data Integrity
```bash
# Check backup status
aws --profile dr backup describe-backup-vault \
  --backup-vault-name axis-imaging-backup-vault-dr-production

# List recent backup jobs
aws --profile dr backup list-backup-jobs \
  --by-backup-vault-name axis-imaging-backup-vault-dr-production \
  --by-creation-date-after $(date -d '24 hours ago' --iso-8601)

# Check cross-region replication status
aws --profile dr s3api head-object \
  --bucket axis-imaging-backups-dr-production \
  --key database-backups/$(date +%Y)/$(date +%m)/latest-backup.sql.enc
```

#### 2.2 Restore Database in DR Region
```bash
# Create new RDS instance from backup
LATEST_SNAPSHOT=$(aws --profile dr rds describe-db-snapshots \
  --db-instance-identifier axis-imaging-primary-production \
  --query 'DBSnapshots[0].DBSnapshotIdentifier' --output text)

aws --profile dr rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier axis-imaging-primary-dr-production \
  --db-snapshot-identifier $LATEST_SNAPSHOT \
  --db-instance-class db.r6g.xlarge \
  --vpc-security-group-ids sg-XXXXXXXX \
  --db-subnet-group-name axis-imaging-db-subnet-group-dr-production \
  --publicly-accessible false

# Wait for database to become available
aws --profile dr rds wait db-instance-available \
  --db-instance-identifier axis-imaging-primary-dr-production

# Get new database endpoint
DR_DB_ENDPOINT=$(aws --profile dr rds describe-db-instances \
  --db-instance-identifier axis-imaging-primary-dr-production \
  --query 'DBInstances[0].Endpoint.Address' --output text)

echo "DR Database endpoint: $DR_DB_ENDPOINT"
```

#### 2.3 Update Database Configuration
```bash
# Update Secrets Manager with DR database endpoint
aws --profile dr secretsmanager put-secret-value \
  --secret-id axis-imaging/database/password/production-dr \
  --secret-string '{
    "username": "postgres",
    "password": "ENCRYPTED_PASSWORD",
    "engine": "postgres",
    "host": "'$DR_DB_ENDPOINT'",
    "port": 5432,
    "dbname": "axis_imaging"
  }'

# Verify database connectivity
psql postgresql://postgres:PASSWORD@$DR_DB_ENDPOINT:5432/axis_imaging -c "SELECT version();"
```

### Phase 3: Application Recovery (60-240 minutes)

#### 3.1 Deploy DR Infrastructure
```bash
# Switch to DR terraform workspace
cd infrastructure/terraform
terraform workspace select production-dr

# Apply DR infrastructure
terraform apply -var-file=terraform-dr.tfvars -auto-approve

# Get outputs
DR_CLUSTER_NAME=$(terraform output -raw dr_cluster_name)
DR_ALB_DNS=$(terraform output -raw dr_alb_dns_name)
```

#### 3.2 Deploy Application Services
```bash
# Update ECS task definitions with DR database endpoint
aws --profile dr ecs register-task-definition \
  --cli-input-json file://task-definition-dr.json

# Start ECS services in DR region
aws --profile dr ecs create-service \
  --cluster $DR_CLUSTER_NAME \
  --service-name axis-imaging-backend-production-dr \
  --task-definition axis-imaging-backend-production-dr:1 \
  --desired-count 2 \
  --load-balancers targetGroupArn=TARGET_GROUP_ARN,containerName=backend,containerPort=5000

aws --profile dr ecs create-service \
  --cluster $DR_CLUSTER_NAME \
  --service-name axis-imaging-frontend-production-dr \
  --task-definition axis-imaging-frontend-production-dr:1 \
  --desired-count 2 \
  --load-balancers targetGroupArn=TARGET_GROUP_ARN,containerName=frontend,containerPort=80

# Wait for services to become stable
aws --profile dr ecs wait services-stable \
  --cluster $DR_CLUSTER_NAME \
  --services axis-imaging-backend-production-dr axis-imaging-frontend-production-dr
```

#### 3.3 Restore File Storage
```bash
# Restore uploads from S3 backup
aws --profile dr s3 sync \
  s3://axis-imaging-backups-dr-production/file-uploads/ \
  s3://axis-imaging-uploads-dr-production/

# Restore audit logs to EFS
aws --profile dr datasync create-task \
  --source-location-arn arn:aws:datasync:$DR_REGION:ACCOUNT:location/S3_LOCATION \
  --destination-location-arn arn:aws:datasync:$DR_REGION:ACCOUNT:location/EFS_LOCATION
```

### Phase 4: DNS Failover (180-300 minutes)

#### 4.1 Update DNS Records
```bash
# Update Route 53 records to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "portal.axisimaging.com.au",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$DR_ALB_DNS'"}]
      }
    }, {
      "Action": "UPSERT", 
      "ResourceRecordSet": {
        "Name": "api.axisimaging.com.au",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$DR_ALB_DNS'"}]
      }
    }]
  }'

# Verify DNS propagation
dig portal.axisimaging.com.au
nslookup api.axisimaging.com.au 8.8.8.8
```

#### 4.2 SSL Certificate Validation
```bash
# Check SSL certificate status in DR region
aws --profile dr acm describe-certificate \
  --certificate-arn $(terraform output -raw dr_ssl_certificate_arn)

# Test HTTPS connectivity
curl -I https://portal.axisimaging.com.au
curl -I https://api.axisimaging.com.au/health
```

### Phase 5: Validation and Testing (240-480 minutes)

#### 5.1 Functional Testing
```bash
# Health check validation
curl https://api.axisimaging.com.au/health
curl https://portal.axisimaging.com.au/health

# Database connectivity test
curl https://api.axisimaging.com.au/health/db

# Authentication system test
curl -X POST https://api.axisimaging.com.au/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}'
```

#### 5.2 Performance Validation
```bash
# Load testing with reduced load
artillery run --config '{"target": "https://api.axisimaging.com.au", "phases": [{"duration": 60, "arrivalRate": 5}]}' load-test.yml

# Monitor response times
aws --profile dr cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=$DR_ALB_ARN_SUFFIX \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average
```

#### 5.3 Data Integrity Verification
```bash
# Verify critical data
psql postgresql://postgres:PASSWORD@$DR_DB_ENDPOINT:5432/axis_imaging -c "
SELECT COUNT(*) as patient_count FROM patients;
SELECT COUNT(*) as study_count FROM studies;
SELECT MAX(created_at) as latest_record FROM audit_logs;
"

# Compare with known counts from before disaster
# This requires pre-disaster baseline data
```

## Service-Specific Recovery

### Database-Only Failure

#### Quick Recovery (RDS Multi-AZ)
```bash
# Force failover to standby
aws --profile primary rds reboot-db-instance \
  --db-instance-identifier axis-imaging-primary-production \
  --force-failover

# Monitor failover progress
aws --profile primary rds describe-events \
  --source-identifier axis-imaging-primary-production \
  --source-type db-instance
```

#### Point-in-Time Recovery
```bash
# Restore to specific time
aws --profile primary rds restore-db-instance-to-point-in-time \
  --db-instance-identifier axis-imaging-pitr-recovery \
  --source-db-instance-identifier axis-imaging-primary-production \
  --restore-time $(date -d '30 minutes ago' --iso-8601) \
  --db-instance-class db.r6g.xlarge
```

### Application-Only Failure

#### ECS Service Recovery
```bash
# Scale down to 0
aws --profile primary ecs update-service \
  --cluster $CLUSTER_NAME \
  --service axis-imaging-backend-production \
  --desired-count 0

# Wait for tasks to stop
aws --profile primary ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services axis-imaging-backend-production

# Scale back up
aws --profile primary ecs update-service \
  --cluster $CLUSTER_NAME \
  --service axis-imaging-backend-production \
  --desired-count 2
```

#### Container Image Rollback
```bash
# Rollback to previous task definition
PREVIOUS_TASK_DEF=$(aws --profile primary ecs list-task-definitions \
  --family-prefix axis-imaging-backend-production \
  --sort DESC --max-items 2 \
  --query 'taskDefinitionArns[1]' --output text)

aws --profile primary ecs update-service \
  --cluster $CLUSTER_NAME \
  --service axis-imaging-backend-production \
  --task-definition $PREVIOUS_TASK_DEF
```

## Security Incident Recovery

### Data Breach Response
```bash
# Immediate isolation
aws --profile primary ecs update-service \
  --cluster $CLUSTER_NAME \
  --service axis-imaging-backend-production \
  --desired-count 0

# Block all external access
aws --profile primary ec2 revoke-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create forensic snapshots
aws --profile primary rds create-db-snapshot \
  --db-instance-identifier axis-imaging-primary-production \
  --db-snapshot-identifier forensic-snapshot-$(date +%Y%m%d-%H%M%S)

aws --profile primary ec2 create-snapshot \
  --volume-id vol-XXXXXXXX \
  --description "Forensic snapshot $(date)"
```

### Clean Recovery Environment
```bash
# Deploy to DR region with clean state
cd infrastructure/terraform
terraform workspace select production-dr-clean

# Apply clean infrastructure
terraform apply -var="force_new_deployment=true" -auto-approve

# Deploy known-good container images
aws --profile dr ecs update-service \
  --cluster axis-imaging-cluster-production-dr \
  --service axis-imaging-backend-production-dr \
  --task-definition axis-imaging-backend-production-dr:KNOWN_GOOD_REVISION
```

## Recovery Monitoring

### Health Monitoring
```bash
# Continuous health checks
while true; do
  echo "$(date): Health Check"
  curl -s https://api.axisimaging.com.au/health | jq .
  sleep 30
done

# Database connectivity monitoring
while true; do
  echo "$(date): DB Check"
  psql postgresql://postgres:PASSWORD@$DR_DB_ENDPOINT:5432/axis_imaging -c "SELECT 1;" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "Database OK"
  else
    echo "Database ERROR"
  fi
  sleep 60
done
```

### Performance Monitoring
```bash
# Monitor key metrics during recovery
aws --profile dr cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "m1",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "TargetResponseTime",
          "Dimensions": [{"Name": "LoadBalancer", "Value": "'$DR_ALB_ARN_SUFFIX'"}]
        },
        "Period": 300,
        "Stat": "Average"
      }
    },
    {
      "Id": "m2", 
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ECS",
          "MetricName": "CPUUtilization",
          "Dimensions": [
            {"Name": "ServiceName", "Value": "axis-imaging-backend-production-dr"},
            {"Name": "ClusterName", "Value": "'$DR_CLUSTER_NAME'"}
          ]
        },
        "Period": 300,
        "Stat": "Average"
      }
    }
  ]' \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601)
```

## Post-Recovery Procedures

### Data Synchronization
```bash
# Once primary region is restored, sync data back
aws s3 sync s3://axis-imaging-uploads-dr-production/ \
             s3://axis-imaging-uploads-production/

# Database sync (if needed)
pg_dump postgresql://postgres:PASSWORD@$DR_DB_ENDPOINT:5432/axis_imaging | \
psql postgresql://postgres:PASSWORD@$PRIMARY_DB_ENDPOINT:5432/axis_imaging
```

### Failback to Primary Region
```bash
# Reverse DNS changes
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failback-dns.json

# Scale down DR services
aws --profile dr ecs update-service \
  --cluster $DR_CLUSTER_NAME \
  --service axis-imaging-backend-production-dr \
  --desired-count 0

# Scale up primary services  
aws --profile primary ecs update-service \
  --cluster axis-imaging-cluster-production \
  --service axis-imaging-backend-production \
  --desired-count 2
```

### Documentation and Review
- [ ] Complete disaster recovery timeline
- [ ] Document lessons learned
- [ ] Update recovery procedures
- [ ] Conduct post-incident review
- [ ] Update contact information
- [ ] Schedule DR drill improvements
- [ ] Update backup/replication procedures
- [ ] Review and update RTOs/RPOs

## Communication Templates

### Initial Notification
```
SUBJECT: [URGENT] Disaster Recovery Activated - Axis Imaging

Disaster recovery procedures have been activated for the Axis Imaging Patient Portal.

Incident: [BRIEF_DESCRIPTION]
Start Time: [TIMESTAMP]  
Estimated Recovery: [ETA]

Current Status: [STATUS_UPDATE]

Updates will be provided every 30 minutes.

Contact: [ON_CALL_ENGINEER]
```

### Status Updates
```
SUBJECT: [UPDATE] Disaster Recovery Status - Axis Imaging

Recovery Progress Update:

✓ Phase 1: Assessment Complete
✓ Phase 2: Data Recovery In Progress
⏳ Phase 3: Application Recovery
⏳ Phase 4: DNS Failover
⏳ Phase 5: Validation

Current ETA: [UPDATED_ETA]
Next Update: [TIME]
```

### Recovery Complete
```
SUBJECT: [RESOLVED] Disaster Recovery Complete - Axis Imaging

Disaster recovery has been completed successfully.

Services Status: ✅ OPERATIONAL
Final Resolution Time: [DURATION]

Post-recovery actions:
- All systems validated and operational
- Performance monitoring active
- Post-incident review scheduled

Service URLs:
- Portal: https://portal.axisimaging.com.au
- API: https://api.axisimaging.com.au

Contact for questions: [CONTACT_INFO]
```

## Testing and Maintenance

### Monthly Tests
- [ ] Backup restoration test
- [ ] DNS failover test  
- [ ] Communication procedures test
- [ ] Access credential verification

### Quarterly Drills
- [ ] Full region failover simulation
- [ ] Security incident response
- [ ] Database recovery scenarios
- [ ] Load testing in DR environment

### Annual Reviews
- [ ] Update recovery procedures
- [ ] Review RTOs and RPOs
- [ ] Update contact information
- [ ] Infrastructure capacity planning
- [ ] Compliance requirement updates

**Last Updated**: [Current Date]
**Version**: 2.0
**Owner**: DevOps Team  
**Approved by**: CTO, CISO, Compliance Officer

## Emergency Contacts (24/7)

- **Primary On-Call**: +61-XXX-XXX-XXX
- **DevOps Manager**: +61-XXX-XXX-XXX  
- **CTO**: +61-XXX-XXX-XXX
- **AWS Support**: Premium Support Case
- **Compliance Officer**: +61-XXX-XXX-XXX