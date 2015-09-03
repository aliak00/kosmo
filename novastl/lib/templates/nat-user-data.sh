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

log "Beginning Port Address Translator (PAT) configuration..."
log "Determining the MAC address on eth0..."
ETH0_MAC=$(cat /sys/class/net/eth0/address) ||
    die "Unable to determine MAC address on eth0."
log "Found MAC ${ETH0_MAC} for eth0."

VPC_ID_URI="http://169.254.169.254/latest/meta-data/network/interfaces/macs/${ETH0_MAC}/vpc-id"
log "Metadata location for vpc id: ${VPC_ID_URI}"
VPC_ID=$(curl --retry 3 --silent --fail ${VPC_ID_URI})
if [ $? -ne 0 ]; then
    log "Unable to retrive VPC ID from meta-data!"
else
    log "Retrieved VPC ID ${VPC_ID} from meta-data."
fi

VPC_CIDR_URI="http://169.254.169.254/latest/meta-data/network/interfaces/macs/${ETH0_MAC}/vpc-ipv4-cidr-block"
log "Metadata location for vpc ipv4 range: ${VPC_CIDR_URI}"

VPC_CIDR_RANGE=$(curl --retry 3 --silent --fail ${VPC_CIDR_URI})
if [ $? -ne 0 ]; then
   log "Unable to retrive VPC CIDR range from meta-data, using 0.0.0.0/0 instead. PAT may be insecure!"
   VPC_CIDR_RANGE="0.0.0.0/0"
else
   log "Retrieved VPC CIDR range ${VPC_CIDR_RANGE} from meta-data."
fi

log "Enabling PAT..."
sysctl -q -w net.ipv4.ip_forward=1 net.ipv4.conf.eth0.send_redirects=0 && (
   iptables -t nat -C POSTROUTING -o eth0 -s ${VPC_CIDR_RANGE} -j MASQUERADE 2> /dev/null ||
   iptables -t nat -A POSTROUTING -o eth0 -s ${VPC_CIDR_RANGE} -j MASQUERADE ) ||
       error

sysctl net.ipv4.ip_forward net.ipv4.conf.eth0.send_redirects | log
iptables -n -t nat -L POSTROUTING | log

sysctl -w net.ipv4.netfilter.ip_conntrack_tcp_timeout_established=54000 | log
sysctl -w net.netfilter.nf_conntrack_generic_timeout=120 | log
sysctl -w net.ipv4.netfilter.ip_conntrack_max=512000 | log

# Disabling Scatter / Gatherer to improve network performance. This stop
# offloading some work on the network card and somewhat increases CPU usage
# but supposed provide better network throughput on NAT instance.
#ethtool -K eth0 sg off | log

yum update -y aws-cfn-bootstrap aws-cli
# Set AWS CLI default Region
region="{{ "Ref" : "AWS::Region" }}"
export AWS_DEFAULT_REGION=$region
# Set CLI Output to text
export AWS_DEFAULT_OUTPUT="text"
instance_id=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/instance-id`
availability_zone=`curl --retry 3 --retry-delay 0 --silent --fail http://169.254.169.254/latest/meta-data/placement/availability-zone`
log "HA NAT configuration parameters: Instance ID=$instance_id, Region=$region, Availability Zone=$availability_zone, VPC=$VPC_ID"
subnets="`aws ec2 describe-subnets --query 'Subnets[*].SubnetId' --filters Name=vpc-id,Values=$VPC_ID Name=tag:Network,Values=private`"
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
aws ec2 modify-instance-attribute --instance-id $instance_id --source-dest-check "{\"Value\": false}" &&
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