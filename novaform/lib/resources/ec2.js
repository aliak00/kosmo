var AWSResource = require('../awsresource')
    , types = require('../types');

var VPC = AWSResource.define('AWS::EC2::VPC', {
    CidrBlock : { type: types.cidr, required: true },
    EnableDnsSupport : { type: types.boolean },
    EnableDnsHostnames : { type: types.boolean },
    InstanceTenancy : { type: types.enum('default', 'dedicated') },
    Tags : { type: types.tags },
});

var InternetGateway = AWSResource.define('AWS::EC2::InternetGateway', {
    Tags : { type: types.tags },
});

var VPCGatewayAttachment = AWSResource.define('AWS::EC2::VPCGatewayAttachment', {
    VpcId: { type: types.string, required: true },
    InternetGatewayId: { type: types.string },
    VpnGatewayId: { type: types.string },
});

var Subnet = AWSResource.define('AWS::EC2::Subnet', {
    VpcId: { type: types.string, required: true },
    CidrBlock : { type: types.cidr, required: true },
    AvailabilityZone: { type: types.string },
    Tags : { type: types.tags },
});

var RouteTable = AWSResource.define('AWS::EC2::RouteTable', {
    VpcId: { type: types.string, required: true },
    Tags : { type: types.tags },
});

var Route = AWSResource.define('AWS::EC2::Route', {
    DestinationCidrBlock: { type: types.cidr, required: true },
    GatewayId: { type: types.string, required: 'conditional' },
    InstanceId: { type: types.string, required: 'conditional' },
    NetworkInterfaceId: { type: types.string, required: 'conditional' },
    RouteTableId: { type: types.string, required: true },
    VpcPeeringConnectionId: { type: types.string, required: 'conditional' },
}, {
    validator: function(props) {
        if (!(props.GatewayId || props.InstanceId || props.NetworkInterfaceId || props.VpcPeeringConnectionId)) {
            return 'One of GatewayId, InstanceId, NetworkInterfaceId, or VpcPeeringConnectionId should be set';
        }
    },
});

var SubnetRouteTableAssociation = AWSResource.define('AWS::EC2::SubnetRouteTableAssociation', {
    RouteTableId: { type: types.string, required: true },
    SubnetId: { type: types.string, required: true },
});

var NetworkAcl = AWSResource.define('AWS::EC2::NetworkAcl', {
    VpcId: { type: types.string, required: true },
    Tags : { type: types.tags },
});

var NetworkAclEntry = AWSResource.define('AWS::EC2::NetworkAclEntry', {
    CidrBlock: { type: types.cidr, required: true },
    Egress: { type: types.boolean, required: true },
    Icmp: { type: types.icmp, required: 'conditional' },
    NetworkAclId: { type: types.string, required: true },
    PortRange: { type: types.portrange, required: 'conditional' },
    Protocol: { type: types.protocol, required: true },
    RuleAction: { type: types.enum('allow', 'deny'), required: true },
    RuleNumber: { type: types.range(1, 32766), required: true },
}, {
    validator: function(props) {
        if (types.protocol.valueAsName(props.Protocol) === 'icmp' && !props.Icmp) {
            return 'Icmp property is not set';
        }
    },
});

var SubnetNetworkAclAssociation = AWSResource.define('AWS::EC2::SubnetNetworkAclAssociation', {
    SubnetId: { type: types.string, required: true },
    NetworkAclId: { type: types.string, required: true },
});

var EC2SecurityGroupIngressRule = types.object('ec2-security-group-ingress-rule', {
    CidrIp: types.cidr, // conditional
    FromPort: types.number, // required
    IpProtocol: types.protocol, // required
    SourceSecurityGroupId: types.string, // conditional
    SourceSecurityGroupName: types.string, // conditional
    SourceSecurityGroupOwnerId: types.string, // conditional
    ToPort: types.number, // required
});

var EC2SecurityGroupEgressRule = types.object('ec2-security-group-egress-rule', {
    CidrIp: types.cidr, // conditional
    FromPort: types.number, // required
    IpProtocol: types.protocol, // required
    DestinationSecurityGroupId: types.string, // conditional
    ToPort: types.number, // required
});

var SecurityGroup = AWSResource.define('AWS::EC2::SecurityGroup', {
    GroupDescription: { type: types.string, required: true },
    SecurityGroupEgress: { type: types.array },  // array of EC2SecurityGroupEgressRule
    SecurityGroupIngress: { type: types.array },  // array of EC2SecurityGroupIngressRule
    Tags : { type: types.tags },
    VpcId: { type: types.string },
});

var SecurityGroupIngress = AWSResource.define('AWS::EC2::SecurityGroupIngress', {
    CidrIp: { type: types.string, required: 'conditional' },
    FromPort: { type: types.number, required: 'conditional' },
    ToPort: { type: types.number, required: 'conditional' },
    GroupId: { type: types.string, required: 'conditional' },
    GroupName : { type: types.string, required: 'conditional' },
    IpProtocol: { type: types.protocol, required: true },
    SourceSecurityGroupId: { type: types.string, required: 'conditional' },
    SourceSecurityGroupName: { type: types.string, required: 'conditional' },
    SourceSecurityGroupOwnerId: { type: types.string, required: 'conditional' },
});

var SecurityGroupEgress = AWSResource.define('AWS::EC2::SecurityGroupEgress', {
    CidrIp: { type: types.string, required: 'conditional' },
    DestinationSecurityGroupId: { type: types.string, required: 'conditional' },
    FromPort: { type: types.number, required: 'conditional' },
    GroupId: { type: types.string, required: 'conditional' },
    IpProtocol: { type: types.protocol, required: true },
    ToPort: { type: types.number, required: 'conditional' },
});

var EIP = AWSResource.define('AWS::EC2::EIP', {
    InstanceId: { type: types.string },
    Domain: { type: types.enum('vpc') },
});

var Instance = AWSResource.define('AWS::EC2::Instance', {
    AvailabilityZone: { type: types.string },
    BlockDeviceMappings: { type: types.array },
    DisableApiTermination: { type: types.boolean },
    EbsOptimized: { type: types.boolean },
    IamInstanceProfile: { type: types.string },
    ImageId: { type: types.string, required: true },
    InstanceInitiatedShutdownBehavior: { type: types.enum('stop', 'terminate') },
    InstanceType: { type: types.string },
    KernelId: { type: types.string },
    KeyName: { type: types.string },
    Monitoring: { type: types.boolean },
    NetworkInterfaces: { type: types.array },
    PlacementGroupName: { type: types.string },
    PrivateIpAddress: { type: types.string },
    RamdiskId: { type: types.string },
    SecurityGroupIds: { type: types.stringarray, required: 'conditional' },
    SecurityGroups: { type: types.stringarray },
    SourceDestCheck: { type: types.boolean },
    SubnetId: { type: types.string },
    Tags: { type: types.tags },
    Tenancy: { type: types.enum('default', 'dedicated') },
    UserData: { type: types.string },
    Volumes: { type: types.array },
});

var Volume = AWSResource.define('AWS::EC2::Volume', {
    AvailabilityZone: { type: types.string, required: true },
    Encrypted: { type: types.boolean, required: 'conditional' },
    Iops: { type: types.number, required: 'conditional' },
    KmsKeyId: { type: types.string },
    Size: { type: types.string, required: 'conditional' },
    SnapshotId: { type: types.string, required: 'conditional' },
    Tags : { type: types.tags },
    VolumeType: { type: types.string },
});

module.exports = {
    VPC: VPC,
    InternetGateway: InternetGateway,
    VPCGatewayAttachment: VPCGatewayAttachment,
    Subnet: Subnet,
    RouteTable: RouteTable,
    Route: Route,
    SubnetRouteTableAssociation: SubnetRouteTableAssociation,
    NetworkAcl: NetworkAcl,
    NetworkAclEntry: NetworkAclEntry,
    SubnetNetworkAclAssociation: SubnetNetworkAclAssociation,
    SecurityGroup: SecurityGroup,
    SecurityGroupIngress: SecurityGroupIngress,
    SecurityGroupEgress: SecurityGroupEgress,
    EIP: EIP,
    Instance: Instance,
    Volume: Volume,
};
