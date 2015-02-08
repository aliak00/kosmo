var Resource = require('../resource');

function VPC(name, properties) {
    if (!(this instanceof VPC)) {
        return new VPC(name, properties);
    }

    Resource.call(this, 'AWS::EC2::VPC', name, properties);

    this.cidrBlock = this.properties.CidrBlock;
}
VPC.prototype = Object.create(Resource.prototype);

function InternetGateway(name, properties) {
    if (!(this instanceof InternetGateway)) {
        return new InternetGateway(name, properties);
    }

    Resource.call(this, 'AWS::EC2::InternetGateway', name, properties);
}
InternetGateway.prototype = Object.create(Resource.prototype);

function VPCGatewayAttachment(name, properties) {
    if (!(this instanceof VPCGatewayAttachment)) {
        return new VPCGatewayAttachment(name, properties);
    }

    Resource.call(this, 'AWS::EC2::VPCGatewayAttachment', name, properties);
}
VPCGatewayAttachment.prototype = Object.create(Resource.prototype);

function Subnet(name, properties) {
    if (!(this instanceof Subnet)) {
        return new Subnet(name, properties);
    }

    Resource.call(this, 'AWS::EC2::Subnet', name, properties);

    this.cidrBlock = properties.CidrBlock;
    this.availabilityZone = properties.AvailabilityZone;
}
Subnet.prototype = Object.create(Resource.prototype);

function RouteTable(name, properties) {
    if (!(this instanceof RouteTable)) {
        return new RouteTable(name, properties);
    }

    Resource.call(this, 'AWS::EC2::RouteTable', name, properties);
}
RouteTable.prototype = Object.create(Resource.prototype);

function Route(name, properties) {
    if (!(this instanceof Route)) {
        return new Route(name, properties);
    }

    Resource.call(this, 'AWS::EC2::Route', name, properties);
}
Route.prototype = Object.create(Resource.prototype);

function SubnetRouteTableAssociation(name, properties) {
    if (!(this instanceof SubnetRouteTableAssociation)) {
        return new SubnetRouteTableAssociation(name, properties);
    }

    Resource.call(this, 'AWS::EC2::SubnetRouteTableAssociation', name, properties);
}
SubnetRouteTableAssociation.prototype = Object.create(Resource.prototype);

function NetworkAcl(name, properties) {
    if (!(this instanceof NetworkAcl)) {
        return new NetworkAcl(name, properties);
    }

    Resource.call(this, 'AWS::EC2::NetworkAcl', name, properties);
}
NetworkAcl.prototype = Object.create(Resource.prototype);

function NetworkAclEntry(name, properties) {
    if (!(this instanceof NetworkAclEntry)) {
        return new NetworkAclEntry(name, properties);
    }

    Resource.call(this, 'AWS::EC2::NetworkAclEntry', name, properties);
}
NetworkAclEntry.prototype = Object.create(Resource.prototype);

function SubnetNetworkAclAssociation(name, properties) {
    if (!(this instanceof SubnetNetworkAclAssociation)) {
        return new SubnetNetworkAclAssociation(name, properties);
    }

    Resource.call(this, 'AWS::EC2::SubnetNetworkAclAssociation', name, properties);
}
SubnetNetworkAclAssociation.prototype = Object.create(Resource.prototype);

function SecurityGroup(name, properties) {
    if (!(this instanceof SecurityGroup)) {
        return new SecurityGroup(name, properties);
    }

    Resource.call(this, 'AWS::EC2::SecurityGroup', name, properties);
}
SecurityGroup.prototype = Object.create(Resource.prototype);

function SecurityGroupIngress(name, properties) {
    if (!(this instanceof SecurityGroupIngress)) {
        return new SecurityGroupIngress(name, properties);
    }

    Resource.call(this, 'AWS::EC2::SecurityGroupIngress', name, properties);
}
SecurityGroupIngress.prototype = Object.create(Resource.prototype);

function SecurityGroupEgress(name, properties) {
    if (!(this instanceof SecurityGroupEgress)) {
        return new SecurityGroupEgress(name, properties);
    }

    Resource.call(this, 'AWS::EC2::SecurityGroupEgress', name, properties);
}
SecurityGroupEgress.prototype = Object.create(Resource.prototype);

function EIP(name, properties) {
    if (!(this instanceof EIP)) {
        return new EIP(name, properties);
    }

    Resource.call(this, 'AWS::EC2::EIP', name, properties);
}
EIP.prototype = Object.create(Resource.prototype);

function Instance(name, properties) {
    if (!(this instanceof Intance)) {
        return new Intance(name, properties);
    }

    Resource.call(this, 'AWS::EC2::Instance', name, properties);
}
Instance.prototype = Object.create(Resource.prototype);

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
    Instance: Instance
};