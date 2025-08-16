# Incident Response Runbook - Axis Imaging Patient Portal

## Overview

This runbook provides step-by-step procedures for responding to incidents in the Axis Imaging Patient Portal production environment, with special focus on healthcare data protection and compliance requirements.

## Incident Severity Levels

### P0 - Critical (Healthcare Emergency)
- **Response Time**: 15 minutes
- **Escalation**: Immediate
- **Examples**: 
  - System completely down
  - Data breach suspected
  - PHI exposure
  - Audit logging failure

### P1 - High (Significant Impact)
- **Response Time**: 1 hour
- **Escalation**: 2 hours
- **Examples**:
  - Performance severely degraded
  - Database connectivity issues
  - Authentication system failure
  - Backup failures

### P2 - Medium (Moderate Impact)
- **Response Time**: 4 hours
- **Escalation**: 8 hours
- **Examples**:
  - Minor performance issues
  - Non-critical feature failures
  - Monitoring alert storms
  - SSL certificate warnings

### P3 - Low (Minor Impact)
- **Response Time**: 24 hours
- **Escalation**: 48 hours
- **Examples**:
  - Cosmetic issues
  - Documentation updates needed
  - Non-urgent maintenance

## Emergency Contacts

### Primary On-Call
- **DevOps Lead**: +61-XXX-XXXX-XXX
- **Development Lead**: +61-XXX-XXXX-XXX
- **Security Lead**: +61-XXX-XXXX-XXX

### Escalation Chain
1. **Technical Manager**: manager@axisimaging.com.au
2. **CTO**: cto@axisimaging.com.au
3. **CEO**: ceo@axisimaging.com.au

### External Contacts
- **AWS Support**: Premium Support Case
- **Compliance Officer**: compliance@axisimaging.com.au
- **Legal Counsel**: legal@axisimaging.com.au
- **Insurance Provider**: XXX-XXXX

## System Access

### Quick Access Commands

```bash
# Set environment variables
export AWS_REGION=ap-southeast-2
export CLUSTER_NAME=axis-imaging-cluster-production
export ENVIRONMENT=production

# AWS CLI login
aws sso login

# Get ECS service status
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services axis-imaging-backend-production axis-imaging-frontend-production

# Access application logs
aws logs tail /ecs/axis-imaging-backend-production --follow

# Database connection
DB_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier axis-imaging-primary-production \
  --query 'DBInstances[0].Endpoint.Address' --output text)
```

### Monitoring Dashboards
- **Primary Dashboard**: https://console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#dashboards:name=axis-imaging-dashboard-production
- **Grafana**: https://monitoring.axisimaging.com.au/grafana/
- **Application**: https://portal.axisimaging.com.au
- **Health Check**: https://api.axisimaging.com.au/health

## Common Incident Types

## 1. System Outage (P0)

### Symptoms
- Health checks failing
- 5xx errors increasing
- Users cannot access system
- No response from application

### Immediate Actions (First 15 minutes)
1. **Assess Impact**
   ```bash
   # Check load balancer health
   aws elbv2 describe-target-health \
     --target-group-arn $(aws elbv2 describe-target-groups \
       --names axis-imaging-backend-tg-production \
       --query 'TargetGroups[0].TargetGroupArn' --output text)
   
   # Check ECS service status
   aws ecs describe-services \
     --cluster $CLUSTER_NAME \
     --services axis-imaging-backend-production
   ```

2. **Emergency Communication**
   ```bash
   # Post to status page
   curl -X POST "https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/incidents" \
     -H "Authorization: OAuth YOUR_API_KEY" \
     -d "incident[name]=System Outage" \
     -d "incident[status]=investigating" \
     -d "incident[impact_override]=major"
   ```

3. **Check Recent Deployments**
   ```bash
   # Check recent ECS deployments
   aws ecs list-tasks --cluster $CLUSTER_NAME \
     --service-name axis-imaging-backend-production
   
   # Check task definition history
   aws ecs describe-task-definition \
     --task-definition axis-imaging-backend-production
   ```

### Investigation Steps
1. **Check Application Logs**
   ```bash
   # Backend logs
   aws logs filter-log-events \
     --log-group-name /ecs/axis-imaging-backend-production \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern "ERROR"
   ```

2. **Database Health**
   ```bash
   # Check RDS status
   aws rds describe-db-instances \
     --db-instance-identifier axis-imaging-primary-production
   
   # Check database connections
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name DatabaseConnections \
     --dimensions Name=DBInstanceIdentifier,Value=axis-imaging-primary-production \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Average
   ```

3. **Infrastructure Issues**
   ```bash
   # Check VPC Flow Logs for network issues
   aws ec2 describe-flow-logs \
     --filter Name=resource-type,Values=VPC \
     --filter Name=resource-id,Values=$(terraform output -raw vpc_id)
   ```

### Resolution Actions
1. **Immediate Rollback** (if recent deployment)
   ```bash
   # Rollback to previous task definition
   PREVIOUS_REVISION=$(aws ecs list-task-definitions \
     --family-prefix axis-imaging-backend-production \
     --sort DESC --max-items 2 \
     --query 'taskDefinitionArns[1]' --output text)
   
   aws ecs update-service \
     --cluster $CLUSTER_NAME \
     --service axis-imaging-backend-production \
     --task-definition $PREVIOUS_REVISION
   ```

2. **Scale Up Resources**
   ```bash
   # Increase desired count
   aws ecs update-service \
     --cluster $CLUSTER_NAME \
     --service axis-imaging-backend-production \
     --desired-count 4
   ```

3. **Emergency Maintenance Mode**
   ```bash
   # Enable maintenance page
   aws s3 cp maintenance.html s3://axis-imaging-frontend-bucket/maintenance.html
   
   # Update ALB listener rule to redirect to maintenance page
   # (This requires pre-configured maintenance target group)
   ```

## 2. Data Breach / PHI Exposure (P0)

### Immediate Actions (First 5 minutes)
1. **Isolate Affected Systems**
   ```bash
   # Stop affected services immediately
   aws ecs update-service \
     --cluster $CLUSTER_NAME \
     --service axis-imaging-backend-production \
     --desired-count 0
   
   # Block suspicious IP addresses at WAF level
   aws wafv2 update-ip-set \
     --scope REGIONAL \
     --id $(aws wafv2 list-ip-sets --scope REGIONAL \
       --query 'IPSets[?Name==`axis-imaging-blocked-ips-production`].Id' --output text) \
     --addresses 192.0.2.1/32
   ```

2. **Preserve Evidence**
   ```bash
   # Create snapshot of affected database
   aws rds create-db-snapshot \
     --db-instance-identifier axis-imaging-primary-production \
     --db-snapshot-identifier breach-investigation-$(date +%Y%m%d-%H%M%S)
   
   # Copy current logs for forensics
   aws s3 sync s3://axis-imaging-audit-logs-production/ \
     s3://axis-imaging-forensics-$(date +%Y%m%d)/ --exclude "*" --include "$(date +%Y/%m/%d)*"
   ```

3. **Notify Required Parties**
   - Privacy Officer (immediately)
   - Legal Counsel (within 15 minutes)
   - OAIC (within 72 hours if required)
   - Affected patients (as determined by legal)

### Investigation Checklist
- [ ] Identify scope of potential exposure
- [ ] Determine attack vector
- [ ] Assess data types accessed
- [ ] Identify affected patient records
- [ ] Document timeline of events
- [ ] Preserve all logs and evidence

### Compliance Actions
- [ ] Complete incident report form
- [ ] Notify Australian Privacy Commissioner if required
- [ ] Prepare patient notification letters
- [ ] Document remediation steps
- [ ] Conduct post-incident review

## 3. Database Issues (P1)

### Symptoms
- Connection timeouts
- High response times
- Database errors in logs
- Connection pool exhaustion

### Immediate Actions
1. **Check Database Status**
   ```bash
   # RDS instance status
   aws rds describe-db-instances \
     --db-instance-identifier axis-imaging-primary-production \
     --query 'DBInstances[0].[DBInstanceStatus,Engine,EngineVersion,AllocatedStorage,DBInstanceClass]'
   
   # Check recent events
   aws rds describe-events \
     --source-identifier axis-imaging-primary-production \
     --source-type db-instance \
     --start-time $(date -d '2 hours ago' --iso-8601)
   ```

2. **Monitor Key Metrics**
   ```bash
   # CPU utilization
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name CPUUtilization \
     --dimensions Name=DBInstanceIdentifier,Value=axis-imaging-primary-production \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 --statistics Average
   
   # Connection count
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name DatabaseConnections \
     --dimensions Name=DBInstanceIdentifier,Value=axis-imaging-primary-production \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 --statistics Average
   ```

3. **Check Slow Query Log**
   ```bash
   # Download slow query log
   aws rds download-db-log-file-portion \
     --db-instance-identifier axis-imaging-primary-production \
     --log-file-name slowquery/postgresql.log.$(date +%Y-%m-%d)
   ```

### Resolution Actions
1. **Failover to Read Replica**
   ```bash
   # Promote read replica to master
   aws rds promote-read-replica \
     --db-instance-identifier axis-imaging-read-replica-production
   
   # Update application config to point to new master
   # (This requires application restart)
   ```

2. **Scale Database Resources**
   ```bash
   # Modify instance class
   aws rds modify-db-instance \
     --db-instance-identifier axis-imaging-primary-production \
     --db-instance-class db.r6g.2xlarge \
     --apply-immediately
   ```

3. **Connection Pool Tuning**
   - Restart application with increased pool size
   - Review slow queries and optimize
   - Consider read replica for read-heavy operations

## 4. Security Incidents (P0/P1)

### Suspicious Activity Detection
1. **Check WAF Logs**
   ```bash
   # Review blocked requests
   aws logs filter-log-events \
     --log-group-name /aws/wafv2/axis-imaging-waf-production \
     --start-time $(date -d '2 hours ago' +%s)000 \
     --filter-pattern "{ $.action = \"BLOCK\" }"
   ```

2. **Review Access Patterns**
   ```bash
   # Check for unusual IP addresses
   aws logs filter-log-events \
     --log-group-name /ecs/axis-imaging-backend-production \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern "{ $.eventType = \"AUTHENTICATION\" && $.success = false }"
   ```

3. **Audit Log Analysis**
   ```bash
   # Check for privilege escalation attempts
   aws logs filter-log-events \
     --log-group-name /ecs/axis-imaging-backend-production \
     --start-time $(date -d '2 hours ago' +%s)000 \
     --filter-pattern "PRIVILEGE_ESCALATION"
   ```

### Response Actions
1. **Block Malicious Traffic**
   ```bash
   # Add IP to WAF block list
   # Update security groups
   # Enable additional logging
   ```

2. **Reset Compromised Accounts**
   ```bash
   # Force password reset for affected users
   # Invalidate all sessions
   # Enable additional MFA requirements
   ```

## 5. Performance Degradation (P1/P2)

### Investigation Steps
1. **Check Auto-scaling Status**
   ```bash
   # ECS service events
   aws ecs describe-services \
     --cluster $CLUSTER_NAME \
     --services axis-imaging-backend-production \
     --query 'services[0].events[0:10]'
   
   # Auto-scaling activities
   aws application-autoscaling describe-scaling-activities \
     --service-namespace ecs \
     --resource-id service/$CLUSTER_NAME/axis-imaging-backend-production
   ```

2. **Performance Metrics**
   ```bash
   # Response time trends
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ApplicationELB \
     --metric-name TargetResponseTime \
     --dimensions Name=LoadBalancer,Value=$(terraform output -raw alb_arn_suffix) \
     --start-time $(date -d '2 hours ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 --statistics Average
   ```

3. **Application Profiling**
   - Review APM traces
   - Check database query performance
   - Analyze memory usage patterns

### Optimization Actions
1. **Immediate Scaling**
   ```bash
   # Scale out services
   aws ecs update-service \
     --cluster $CLUSTER_NAME \
     --service axis-imaging-backend-production \
     --desired-count 6
   ```

2. **Database Optimization**
   - Enable Performance Insights
   - Add database indexes
   - Optimize slow queries

## Post-Incident Procedures

### 1. Incident Documentation
- [ ] Complete incident timeline
- [ ] Document root cause analysis
- [ ] List all actions taken
- [ ] Identify lessons learned
- [ ] Update runbooks if needed

### 2. Communication
- [ ] Internal incident report
- [ ] Customer communication (if required)
- [ ] Compliance notifications
- [ ] Status page updates

### 3. Follow-up Actions
- [ ] Implement preventive measures
- [ ] Update monitoring and alerting
- [ ] Conduct post-incident review
- [ ] Update documentation
- [ ] Schedule follow-up training

## Testing and Validation

### Regular Drills
- Monthly incident response drills
- Quarterly disaster recovery tests
- Annual security incident simulations
- Compliance audit preparations

### Runbook Updates
- Review quarterly or after major incidents
- Test all procedures in staging environment
- Validate contact information monthly
- Update based on system changes

## Healthcare Compliance Notes

### Privacy Act 1988 Requirements
- All incidents involving PHI must be logged
- Notification timelines must be followed
- Evidence preservation is critical
- Patient rights must be protected

### Audit Trail
- All incident response actions must be logged
- Maintain chain of custody for evidence
- Document decision-making process
- Preserve logs for required retention period

**Last Updated**: [Current Date]
**Version**: 1.0
**Owner**: DevOps Team
**Approved by**: CTO, Compliance Officer