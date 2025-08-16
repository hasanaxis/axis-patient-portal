# Production Deployment Guide - Axis Imaging Patient Portal

## Overview

This guide provides comprehensive instructions for deploying the Axis Imaging Patient Portal to production in Australian data centers with full healthcare compliance.

## Prerequisites

### Required Tools
- [AWS CLI](https://aws.amazon.com/cli/) v2.0 or higher
- [Terraform](https://terraform.io/) v1.0 or higher
- [Docker](https://docker.com/) v20.0 or higher
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (if using EKS)
- [GitHub CLI](https://cli.github.com/) (optional)

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- Access to Australian regions (ap-southeast-2, ap-southeast-4)

### Environment Variables
```bash
export AWS_REGION=ap-southeast-2
export AWS_ACCOUNT_ID=<your-account-id>
export PROJECT_NAME=axis-imaging
export ENVIRONMENT=production
export DOMAIN_NAME=portal.axisimaging.com.au
```

## 1. Infrastructure Deployment

### Step 1: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform with remote state
terraform init

# Create workspace for production
terraform workspace new production || terraform workspace select production
```

### Step 2: Plan Infrastructure

```bash
# Create terraform.tfvars for production
cat > terraform.tfvars << EOF
project_name = "axis-imaging"
environment = "production"
domain_name = "portal.axisimaging.com.au"

# Database configuration
db_instance_class = "db.r6g.xlarge"
db_allocated_storage = 500
db_max_allocated_storage = 2000

# ECS configuration
backend_desired_count = 2
backend_min_capacity = 2
backend_max_capacity = 10

# Auto-scaling thresholds
cpu_scale_up_threshold = 70
memory_scale_up_threshold = 80

# Compliance settings
enable_encryption_at_rest = true
enable_vpc_flow_logs = true
log_retention_days = 2555  # 7 years
backup_retention_days = 2555
EOF

# Plan deployment
terraform plan -var-file=terraform.tfvars -out=production.plan

# Review the plan carefully
terraform show production.plan
```

### Step 3: Deploy Infrastructure

```bash
# Apply the infrastructure changes
terraform apply production.plan

# Note the outputs (save these values)
terraform output
```

**Important**: Save all Terraform outputs including:
- VPC ID
- Subnet IDs
- Security Group IDs
- Load Balancer DNS
- Database endpoints
- ECR repository URLs

## 2. Application Deployment

### Step 1: Build and Push Docker Images

```bash
# Configure Docker for ECR
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
cd backend
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/axis-imaging-backend:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/axis-imaging-backend:latest

# Build and push frontend
cd ../frontend
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/axis-imaging-frontend:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/axis-imaging-frontend:latest
```

### Step 2: Database Setup

```bash
# Connect to the database
DB_HOST=$(terraform output -raw db_host)
DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id axis-imaging/database/password/production \
    --query SecretString --output text | jq -r .password)

# Run migrations
cd backend
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/axis_imaging" \
    npx prisma migrate deploy

# Verify database setup
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/axis_imaging" \
    npx prisma db seed
```

### Step 3: Deploy to ECS

The ECS services should auto-deploy when new images are pushed, but you can force deployment:

```bash
# Update backend service
aws ecs update-service \
    --cluster axis-imaging-cluster-production \
    --service axis-imaging-backend-production \
    --force-new-deployment

# Update frontend service
aws ecs update-service \
    --cluster axis-imaging-cluster-production \
    --service axis-imaging-frontend-production \
    --force-new-deployment

# Wait for deployments to complete
aws ecs wait services-stable \
    --cluster axis-imaging-cluster-production \
    --services axis-imaging-backend-production axis-imaging-frontend-production
```

## 3. DNS and SSL Configuration

### Step 1: Configure Route 53

```bash
# Get the load balancer DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route 53 records (if not using Terraform)
aws route53 change-resource-record-sets \
    --hosted-zone-id <your-hosted-zone-id> \
    --change-batch file://dns-changes.json
```

**dns-changes.json**:
```json
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "portal.axisimaging.com.au",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "ALB_DNS_FROM_TERRAFORM"}]
    }
  }]
}
```

### Step 2: Verify SSL Certificate

```bash
# Check certificate status
aws acm describe-certificate \
    --certificate-arn $(terraform output -raw ssl_certificate_arn)

# Test HTTPS connectivity
curl -I https://portal.axisimaging.com.au
```

## 4. Health Checks and Validation

### Step 1: Application Health

```bash
# Test backend health
curl https://api.axisimaging.com.au/health

# Test frontend health  
curl https://portal.axisimaging.com.au/health

# Test database connectivity
curl https://api.axisimaging.com.au/health/db
```

### Step 2: Security Validation

```bash
# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 portal.axisimaging.com.au

# Test WAF protection
curl -H "User-Agent: sqlmap" https://portal.axisimaging.com.au

# Verify security headers
curl -I https://portal.axisimaging.com.au
```

### Step 3: Performance Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
cd tests/load
artillery run load-test.yml
```

## 5. Monitoring Setup

### Step 1: Verify CloudWatch Dashboards

```bash
# Open CloudWatch dashboard
aws cloudwatch get-dashboard \
    --dashboard-name axis-imaging-dashboard-production
```

### Step 2: Test Alerting

```bash
# Trigger a test alert
aws sns publish \
    --topic-arn $(terraform output -raw alerts_topic_arn) \
    --subject "Test Alert" \
    --message "Testing alerting system"
```

### Step 3: Access Grafana (if deployed)

```bash
# Get Grafana URL
echo "Grafana URL: https://$(terraform output -raw alb_dns_name)/grafana/"

# Get initial admin password
docker exec axis-grafana cat /etc/grafana/grafana.ini | grep admin_password
```

## 6. Backup Validation

### Step 1: Verify Backup Configuration

```bash
# Check backup plan
aws backup describe-backup-plan \
    --backup-plan-id $(terraform output -raw backup_plan_id)

# List recent backup jobs
aws backup list-backup-jobs \
    --by-backup-vault-name $(terraform output -raw backup_vault_name)
```

### Step 2: Test Disaster Recovery

```bash
# Run DR test script
cd infrastructure/scripts
./test-disaster-recovery.sh
```

## 7. Final Verification Checklist

### Healthcare Compliance
- [ ] All data encrypted at rest and in transit
- [ ] Audit logging enabled and functional
- [ ] Backup retention set to 7 years
- [ ] Access controls implemented
- [ ] Data sovereignty verified (all data in Australia)

### Security
- [ ] WAF rules active
- [ ] SSL/TLS configured correctly
- [ ] Security groups properly configured
- [ ] VPC Flow Logs enabled
- [ ] IAM roles follow least privilege

### Performance
- [ ] Auto-scaling configured
- [ ] Load balancer health checks passing
- [ ] Database read replicas functional
- [ ] CDN configured for static assets
- [ ] Response times under SLA

### Monitoring
- [ ] CloudWatch dashboards accessible
- [ ] All alerts configured
- [ ] Log aggregation working
- [ ] Performance insights enabled
- [ ] Uptime monitoring active

### Backup & Recovery
- [ ] Daily backups running
- [ ] Cross-region replication working
- [ ] Recovery procedures tested
- [ ] Backup integrity verified
- [ ] RTO/RPO requirements met

## 8. Post-Deployment Tasks

### Step 1: User Acceptance Testing

```bash
# Run automated UAT suite
cd frontend
npm run test:uat

# Manual testing checklist available at:
# docs/testing/UAT_CHECKLIST.md
```

### Step 2: Performance Baseline

```bash
# Establish performance baseline
cd monitoring/scripts
./establish-baseline.sh
```

### Step 3: Documentation Update

- Update system architecture diagrams
- Document any production-specific configurations
- Update runbooks with production endpoints
- Update emergency contact procedures

## Rollback Procedures

### Emergency Rollback

```bash
# Rollback to previous task definition
aws ecs update-service \
    --cluster axis-imaging-cluster-production \
    --service axis-imaging-backend-production \
    --task-definition axis-imaging-backend-production:<previous-revision>

# Rollback database migrations (if needed)
cd backend
npx prisma migrate reset --skip-seed --force
```

### Infrastructure Rollback

```bash
# Rollback infrastructure changes
cd infrastructure/terraform
terraform apply -target=<specific-resource> -var-file=terraform.tfvars.backup
```

## Troubleshooting

### Common Issues

1. **ECS Service Fails to Start**
   - Check CloudWatch logs
   - Verify environment variables
   - Check security group rules

2. **Database Connection Issues**
   - Verify security groups
   - Check database status
   - Validate connection strings

3. **SSL Certificate Issues**
   - Verify DNS propagation
   - Check certificate validation
   - Review Route 53 configuration

### Support Contacts

- **Infrastructure**: DevOps Team
- **Application**: Development Team  
- **Security**: InfoSec Team
- **Compliance**: Compliance Officer

### Log Locations

- **Application Logs**: CloudWatch `/ecs/axis-imaging-*`
- **Infrastructure Logs**: CloudWatch `/aws/vpc/flowlogs`
- **Audit Logs**: EFS `/audit-logs/` + S3 backup
- **Access Logs**: S3 bucket `axis-imaging-alb-logs-*`

## Compliance Certification

This deployment meets the following compliance requirements:
- ✅ Privacy Act 1988 (Australia)
- ✅ Australian Government ISM
- ✅ HIPAA (where applicable)
- ✅ ISO 27001 controls
- ✅ SOC 2 Type II controls

**Deployment Certification**: This production deployment has been reviewed and approved for healthcare data processing in accordance with Australian privacy laws and regulations.

**Date**: ________________
**Approved by**: ________________
**Compliance Officer**: ________________