var AWSResource = require('../aws-resource')
    , commonObjects = require('../common-objects')
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
    validator: function(context) {
        if (!(context.properties.GatewayId
            || context.properties.InstanceId
            || context.properties.NetworkInterfaceId
            || context.properties.VpcPeeringConnectionId)) {
            context.addError('One of GatewayId, InstanceId, NetworkInterfaceId, or VpcPeeringConnectionId should be set');
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

var IcmpType = types.object('Icmp', {
    Code: { type: types.number, required: 'conditional' },
    Type: { type: types.number, required: 'conditional' },
});

var NetworkAclEntry = AWSResource.define('AWS::EC2::NetworkAclEntry', {
    CidrBlock: { type: types.cidr, required: true },
    Egress: { type: types.boolean, required: true },
    Icmp: { type: IcmpType, required: 'conditional' },
    NetworkAclId: { type: types.string, required: true },
    PortRange: { type: types.portrange, required: 'conditional' },
    Protocol: { type: types.protocol, required: true },
    RuleAction: { type: types.enum('allow', 'deny'), required: true },
    RuleNumber: { type: types.range(1, 32766), required: true },
}, {
    validator: function(context) {
        if (context.properties.Protocol
            && types.protocol.valueAsName(context.properties.Protocol) === 'icmp'
            && !context.properties.Icmp) {
            context.addError('Icmp property is not set');
        }
    },
});

var SubnetNetworkAclAssociation = AWSResource.define('AWS::EC2::SubnetNetworkAclAssociation', {
    SubnetId: { type: types.string, required: true },
    NetworkAclId: { type: types.string, required: true },
});

// TODO: Double check the requirement rules for ingress/egress
var SecurityGroupIngressRuleType = types.object('SecurityGroupIngressRule', {
    CidrIp: { type: types.cidr, required: 'conditional' },
    FromPort: { type: types.number, required: true },
    IpProtocol: { type: types.protocol, required: true },
    SourceSecurityGroupId: { type: types.string, required: 'conditional' },
    SourceSecurityGroupName: { type: types.string, required: 'conditional' },
    SourceSecurityGroupOwnerId: { type: types.string, required: 'conditional' },
    ToPort: { type: types.number, required: true },
});

var SecurityGroupEgressRuleType = types.object('SecurityGroupEgressRule', {
    CidrIp: { type: types.cidr, required: 'conditional' },
    FromPort: { type: types.number, required: true },
    IpProtocol: { type: types.protocol, required: true },
    DestinationSecurityGroupId: { type: types.string, required: 'conditional' },
    ToPort: { type: types.number, required: true },
});

var SecurityGroup = AWSResource.define('AWS::EC2::SecurityGroup', {
    GroupDescription: { type: types.string, required: true },
    SecurityGroupEgress: { type: types.array(SecurityGroupEgressRuleType) },
    SecurityGroupIngress: { type: types.array(SecurityGroupIngressRuleType) },
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

var PrivateIpAddressType = types.object('PrivateIpAddress', {
    PrivateIpAddress: { type: types.string, required: true },
    Primary: { type: types.boolean, required: true },
});

var EbsType = types.object('Ebs', {
    DeleteOnTermination: { type: types.boolean },
    Encrypted: { type: types.boolean },
    Iops: { type: types.number, required: 'conditional' },
    SnapshotId: { type: types.string, required: 'conditional' },
    VolumeSize: { type: types.string, required: 'conditional' },
    VolumeType: { type: types.string },
});

var BlockDeviceMappingType = types.object('BlockDeviceMapping', {
    DeviceName: { type: types.string, require: true },
    Ebs: { type: types.array(EbsType), required: 'conditional' },
    NoDevice: { type: types.emptymap },
    VirtualName: { type: types.string, required: 'conditional' },
});

var NetworkInterfaceType = types.object('NetworkInterface', {
    AssociatePublicIpAddress: { type: types.boolean },
    DeleteOnTermination: { type: types.boolean },
    Description: { type: types.string },
    DeviceIndex: { type: types.string, required: true },
    GroupSet: { type: types.array(types.string) },
    NetworkInterfaceId: { type: types.string, required: 'conditional' }, // (on SubnetId)
    PrivateIpAddress: { type: types.string },
    PrivateIpAddresses: { type: types.array(PrivateIpAddressType) },
    SecondaryPrivateIpAddressCount: { type: types.number },
    SubnetId: { type: types.string, required: 'conditional' },
});

var ParameterType = commonObjects.KeyValuePair('Parameter', types.string, types.array(types.string));

var SsmAssociationType = types.object('SsmAssociation', {
    AssociationParameters: { type: types.array(ParameterType) },
    DocumentName: { type: types.string, required: true },
});

var MountPointType = types.object('MountPoint', {
    Device: { type: types.string, required: true },
    VolumeId: { type: types.string, required: true },
});

var Instance = AWSResource.define('AWS::EC2::Instance', {
    AvailabilityZone: { type: types.string },
    BlockDeviceMappings: { type: types.array(BlockDeviceMappingType) },
    DisableApiTermination: { type: types.boolean },
    EbsOptimized: { type: types.boolean },
    IamInstanceProfile: { type: types.string },
    ImageId: { type: types.string, required: true },
    InstanceInitiatedShutdownBehavior: { type: types.enum('stop', 'terminate') },
    InstanceType: { type: types.string },
    KernelId: { type: types.string },
    KeyName: { type: types.string },
    Monitoring: { type: types.boolean },
    NetworkInterfaces: { type: types.array(NetworkInterfaceType) },
    PlacementGroupName: { type: types.string },
    PrivateIpAddress: { type: types.string },
    RamdiskId: { type: types.string },
    SecurityGroupIds: { type: types.array(types.string), required: 'conditional' },
    SecurityGroups: { type: types.array(types.string) },
    SsmAssociations: { type: types.array(SsmAssociationType) },
    SourceDestCheck: { type: types.boolean },
    SubnetId: { type: types.string },
    Tags: { type: types.tags },
    Tenancy: { type: types.enum('default', 'dedicated') },
    UserData: { type: types.string },
    Volumes: { type: types.array(MountPointType) },
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

var VPCEndpoint = AWSResource.define('AWS::EC2::VPCEndpoint', {
    PolicyDocument: { type: types.object('ec2-policy-document') },
    RouteTableIds: { type: types.array(types.string) },
    ServiceName: { type: types.string, required: true },
    VpcId: { type: types.string, required: true },
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
    VPCEndpoint: VPCEndpoint,
};
