var Resource = require('./../resource');

function VPC(name, properties) {
    if (!(this instanceof VPC)) {
        return new VPC(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::VPC';
    this.name = name;

    this.cidrBlock = this.properties.CidrBlock;
}
VPC.prototype = Object.create(Resource.prototype);

function InternetGateway(name, properties) {
    if (!(this instanceof InternetGateway)) {
        return new InternetGateway(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::InternetGateway';
    this.name = name;
}
InternetGateway.prototype = Object.create(Resource.prototype);

function VPCGatewayAttachment(name, properties) {
    if (!(this instanceof VPCGatewayAttachment)) {
        return new VPCGatewayAttachment(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::VPCGatewayAttachment';
    this.name = name;
}
VPCGatewayAttachment.prototype = Object.create(Resource.prototype);

function Subnet(name, properties) {
    if (!(this instanceof Subnet)) {
        return new Subnet(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::Subnet';
    this.name = name;

    this.cidrBlock = properties.CidrBlock;
    this.availabilityZone = properties.AvailabilityZone;
}
Subnet.prototype = Object.create(Resource.prototype);

function RouteTable(name, properties) {
    if (!(this instanceof RouteTable)) {
        return new RouteTable(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::RouteTable';
    this.name = name;
}
RouteTable.prototype = Object.create(Resource.prototype);

function Route(name, properties) {
    if (!(this instanceof Route)) {
        return new Route(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::Route';
    this.name = name;
}
Route.prototype = Object.create(Resource.prototype);

function SubnetRouteTableAssociation(name, properties) {
    if (!(this instanceof SubnetRouteTableAssociation)) {
        return new SubnetRouteTableAssociation(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::SubnetRouteTableAssociation';
    this.name = name;
}
SubnetRouteTableAssociation.prototype = Object.create(Resource.prototype);

function NetworkAcl(name, properties) {
    if (!(this instanceof NetworkAcl)) {
        return new NetworkAcl(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::NetworkAcl';
    this.name = name;
}
NetworkAcl.prototype = Object.create(Resource.prototype);

function NetworkAclEntry(name, properties) {
    if (!(this instanceof NetworkAclEntry)) {
        return new NetworkAclEntry(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::NetworkAclEntry';
    this.name = name;
}
NetworkAclEntry.prototype = Object.create(Resource.prototype);

function SubnetNetworkAclAssociation(name, properties) {
    if (!(this instanceof SubnetNetworkAclAssociation)) {
        return new SubnetNetworkAclAssociation(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::SubnetNetworkAclAssociation';
    this.name = name;
}
SubnetNetworkAclAssociation.prototype = Object.create(Resource.prototype);

function SecurityGroup(name, properties) {
    if (!(this instanceof SecurityGroup)) {
        return new SecurityGroup(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::SecurityGroup';
    this.name = name;
}
SecurityGroup.prototype = Object.create(Resource.prototype);

function SecurityGroupIngress(name, properties) {
    if (!(this instanceof SecurityGroupIngress)) {
        return new SecurityGroupIngress(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::SecurityGroupIngress';
    this.name = name;
}
SecurityGroupIngress.prototype = Object.create(Resource.prototype);

function SecurityGroupEgress(name, properties) {
    if (!(this instanceof SecurityGroupEgress)) {
        return new SecurityGroupEgress(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::SecurityGroupEgress';
    this.name = name;
}
SecurityGroupEgress.prototype = Object.create(Resource.prototype);

function EIP(name, properties) {
    if (!(this instanceof EIP)) {
        return new EIP(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::EC2::EIP';
    this.name = name;
}
EIP.prototype = Object.create(Resource.prototype);

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
    EIP: EIP
};