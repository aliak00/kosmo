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
function log { logger -t "bastion" -- $1; }
yum update -y aws-cfn-bootstrap
# Set AWS CLI default Region
region="{{ "Ref" : "AWS::Region" }}"
export AWS_DEFAULT_REGION=$region
# Set CLI Output to text
export AWS_DEFAULT_OUTPUT="text"
instance_id=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/instance-id`
allocation_id="{{ EIP }}"
log "Bastion host configuration parameters: Allocation ID=$allocation_id, Instance ID=$instance_id, Region=$region"
aws ec2 associate-address --allocation-id $allocation_id --instance-id $instance_id --allow-reassociation
log "Configuration of Bastion host complete."
/opt/aws/bin/cfn-init -v \
         --stack {{ "Ref" : "AWS::StackName" }} \
         --resource {{ LaunchConfig }} \
         --region {{ "Ref" : "AWS::Region" }}
/opt/aws/bin/cfn-signal -e $? \
         --stack {{ "Ref" : "AWS::StackName" }} \
         --resource {{ ASGName }} \
         --region {{ "Ref" : "AWS::Region" }}