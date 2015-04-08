#!/bin/bash

# enable for debugging
# set -x

cfn_tools_prefix=/usr/local/bin
cfn_init=$cfn_tools_prefix/cfn-init
cfn_signal=$cfn_tools_prefix/cfn-signal

error() {
  local parent_lineno="$1"
  local message="$2"
  local code="${3:-1}"
  if [[ -n "$message" ]]; then
    echo "Error on or near line ${parent_lineno}: ${message}; exiting with status ${code}"
  else
    echo "Error on or near line ${parent_lineno}; exiting with status ${code}"
  fi
  $cfn_signal -e "${code}" \
      --stack {{ "Ref" : "AWS::StackName" }} \
      --resource {{ ASGName }} \
      --region {{ "Ref" : "AWS::Region" }}
  exit "${code}"
}
trap 'error ${LINENO}' ERR

function log { logger -t "bastion" -- $1; echo $1; }

log "Beginning configuration..."
apt-get update -y
apt-get upgrade -y
apt-get install -y awscli

log "Installing cloudformation tools..."
curl -o /tmp/aws-cfn-bootstrap-latest.tar.gz https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-latest.tar.gz
mkdir /tmp/aws-cfn-bootstrap
tar --strip-components=1 -C /tmp/aws-cfn-bootstrap -xzvf /tmp/aws-cfn-bootstrap-latest.tar.gz
cd /tmp/aws-cfn-bootstrap && python ./setup.py install

log "Initializing cloudformation..."
$cfn_init -v \
    --stack {{ "Ref" : "AWS::StackName" }} \
    --resource {{ LaunchConfigName }} \
    --region {{ "Ref" : "AWS::Region" }} \
  || true # yyyeaaaah, evil, but cfn-init return 1 when instance has not Metadata.

# Set AWS CLI default Region
region="{{ "Ref" : "AWS::Region" }}"
export AWS_DEFAULT_REGION=$region
# Set CLI Output to text
export AWS_DEFAULT_OUTPUT="text"

instance_id=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/instance-id`
allocation_id="{{ EIPAllocId }}"
log "Bastion host configuration parameters: Allocation ID=$allocation_id, Instance ID=$instance_id, Region=$region"

aws ec2 associate-address --allocation-id $allocation_id --instance-id $instance_id --allow-reassociation

log "Configuration of Bastion host complete."

$cfn_signal -e $? \
    --stack {{ "Ref" : "AWS::StackName" }} \
    --resource {{ ASGName }} \
    --region {{ "Ref" : "AWS::Region" }}
