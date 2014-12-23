#!/bin/bash
# enable for debugging
# set -x
error() {
  local parent_lineno="$1"
  local message="$2"
  local code="${3:-1}"
  if [[ -n "$message" ]]; then
    echo "Error on or near line ${parent_lineno}: ${message}; exiting with status ${code}"
  else
    echo "Error on or near line ${parent_lineno}; exiting with status ${code}"
  fi
  /opt/aws/bin/cfn-signal -e "${code}" \
           --stack {{ "Ref" : "AWS::StackName" }} \
           --resource {{ ASGName }} \
           --region {{ "Ref" : "AWS::Region" }}
  exit "${code}"
}
trap 'error ${LINENO}' ERR
function log { logger -t "nat" -- $1; }
yum update -y aws-cfn-bootstrap aws-cli
# Set AWS CLI default Region
region="{{ "Ref" : "AWS::Region" }}"
export AWS_DEFAULT_REGION=$region
# Set CLI Output to text
export AWS_DEFAULT_OUTPUT="text"
vpc_id="{{ VPCNameRef }}"
instance_id=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/instance-id`
availability_zone=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/placement/availability-zone`
log "HA NAT configuration parameters: Instance ID=$instance_id, Region=$region, Availability Zone=$availability_zone, VPC=$vpc_id"
subnets="`aws ec2 describe-subnets --query 'Subnets[*].SubnetId' --filters Name=vpc-id,Values=$vpc_id Name=tag:Network,Values=private`"
if [ -z "$subnets" ]; then
  log "Error: No subnets found"
else
  log "Found the following private subnets: $subnets"
  for subnet in $subnets; do
    route_table_id=`aws ec2 describe-route-tables --query 'RouteTables[*].RouteTableId' --filters Name=association.subnet-id,Values=$subnet`
    if [ ! -z "$route_table_id" ]; then
      aws ec2 create-route --route-table-id $route_table_id --destination-cidr-block 0.0.0.0/0 --instance-id $instance_id &&
        log "$route_table_id associated with $subnet created default route to $instance_id."
      if [ $? -ne 0 ]; then
        aws ec2 replace-route --route-table-id $route_table_id --destination-cidr-block 0.0.0.0/0 --instance-id $instance_id &&
          log "$route_table_id associated with $subnet replaced default route to $instance_id."
      fi
    fi
  done
fi
# Turn off source / destination check
aws ec2 modify-instance-attribute --instance-id $instance_id --source-dest-check "{\\"Value\\": false}" &&
  log "Source Destination check disabled for $instance_id."
log "Configuration of HA NAT complete."
/opt/aws/bin/cfn-init -v \
         --stack {{ "Ref" : "AWS::StackName" }} \
         --resource {{ LaunchConfigName }} \
         --region {{ "Ref" : "AWS::Region" }}
/opt/aws/bin/cfn-signal -e $? \
         --stack {{ "Ref" : "AWS::StackName" }} \
         --resource {{ ASGName }} \
             --region {{ "Ref" : "AWS::Region" }}