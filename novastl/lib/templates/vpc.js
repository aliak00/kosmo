var Template = require('../template')
    , novaform = require('novaform')
    , util = require('util')
    , _ = require('lodash');

/**
    Refs include:
    - vpc: ec2.VPC
    - igw: ec2.InternetGateway
    - gateway-attachment: ec2.VPCGatewayAttachment
    - private: {az: {private refs per az}}
    - public: {az: {public refs per az}}

    For each az the public refs include:
        - subnet: ec2.Subnet
        - route-table: ec2.RouteTable
        - route: ec2.Route
        - subnet-rt-association: ec2.SubnetRouteTableAssociation
        - nacl: ec2.NetworkAcl
        - inbound-http: ec2.NetworkAclEntry
        - inbound-https: ec2.NetworkAclEntry
        - inbound-dynamic-ports: ec2.NetworkAclEntry
        - inbound-ssh: ec2.NetworkAclEntry
        - inbound-icmp: ec2.NetworkAclEntry
        - outbound-http: ec2.NetworkAclEntry
        - outbound-https: ec2.NetworkAclEntry
        - outbound-ssh: ec2.NetworkAclEntry
        - outbound-dynamic-ports: ec2.NetworkAclEntry
        - outbound-icmp: ec2.NetworkAclEntry
        - subnet-nacl-association: ec2.SubnetNetworkAclAssociation

    For each az the private refs include:
        - subnet: ec2.Subnet
        - route-table: ec2.RouteTable
        - subnet-rt-association: ec2.SubnetRouteTableAssociation
        - nacl: ec2.NetworkAcl
        - inbound-dynamic-ports: ec2.NetworkAclEntry
        - inbound-ssh: ec2.NetworkAclEntry
        - inbound-icmp: ec2.NetworkAclEntry
        - outbound-http: ec2.NetworkAclEntry
        - outbound-https: ec2.NetworkAclEntry
        - outbound-dynamic-ports: ec2.NetworkAclEntry
        - outbound-icmp: ec2.NetworkAclEntry
        - subnet-nacl-association: ec2.SubnetNetworkAclAssociation
**/

function mktags(str, visibility, az) {
    return {
        Application: novaform.refs.StackId,
        Name: novaform.join('-', [novaform.refs.StackName, str]),
        Network: visibility,
        AZ: az
    };
}

function Vpc(options) {
    if (!(this instanceof Vpc)) {
        return new Vpc(options);
    }

    Template.call(this);

    var vpcCidr = options.cidr;
    var publicSubnetsPerAz = options.publicSubnetsPerAz;
    var privateSubnetsPerAz = options.privateSubnetsPerAz;
    var name = this.name = options.name || 'Vpc';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    this.vpc = this._addResource(novaform.ec2.VPC(name, {
        CidrBlock: vpcCidr,
        EnableDnsSupport: true,
        EnableDnsHostnames: true,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, name])
        }
    }));

    this.internetGateway = this._addResource(novaform.ec2.InternetGateway(mkname('Igw'), {
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Igw')]),
            Network: 'public'
        }
    }));

    this.internetGatewayAttachment = this._addResource(novaform.ec2.VPCGatewayAttachment(mkname('GatewayAttachment'), {
        VpcId: this.vpc,
        InternetGatewayId: this.internetGateway
    }));

    var publicSubnet = this.createPublicSubnets(publicSubnetsPerAz);
    var privateSubnet = this.createPrivateSubnets(privateSubnetsPerAz);

    var publicSubnetResourcesPerName = _.object(_.map(_.flatten(_.values(publicSubnet.allResourcesPerAz)), function(o) { return [o.name, o]}));
    var privateSubnetResourcesPerName = _.object(_.map(_.flatten(_.values(privateSubnet.allResourcesPerAz)), function(o) { return [o.name, o]}));
    _.extend(this._resources, publicSubnetResourcesPerName);
    _.extend(this._resources, privateSubnetResourcesPerName);

    this._publicSubnetResourcesPerAz = publicSubnet.publicResourcesPerAz;
    this._privateSubnetResourcesPerAz = privateSubnet.publicResourcesPerAz;

    this.publicSubnetsPerAz = publicSubnet.publicResourcesPerAz;
    this.privateSubnetsPerAz = privateSubnet.publicResourcesPerAz;

    this.publicSubnets = _.flatten(_.values(publicSubnet.publicResourcesPerAz));
    this.privateSubnets = _.flatten(_.values(privateSubnet.publicResourcesPerAz));

    this.vpcId = this.vpc;

    this.vpcCidrBlock = vpcCidr;
}

Vpc.prototype = Object.create(Template.prototype);

function mknameAz(str, az) {
    return util.format('%sAZ%s', str, az);
}

function pusher(array) {
    return function(element) {
        array.push(element);
        return element;
    };
}

Vpc.prototype.createPublicSubnets = function(subnets) {
    var vpc = this.vpc;
    var internetGateway = this.internetGateway;
    var internetGatewayAttachment = this.internetGatewayAttachment;

    var subnetsPerAz = {};

    var resourcesPerAz = _.object(_.map(subnets, function(cidr, azName) {
        var az = azName[azName.length - 1];

        var resources = [];
        var push = pusher(resources);

        var publicResources = subnetsPerAz[azName] = [];
        var pushPublic = pusher(publicResources);

        var subnet = pushPublic(push(novaform.ec2.Subnet(mknameAz('PublicSubnet', az), {
            VpcId: vpc,
            AvailabilityZone: azName,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'public', az)
        })));

        var routeTable = push(novaform.ec2.RouteTable(mknameAz('PublicRouteTable', az), {
            VpcId: vpc,
            Tags: mktags('RouteTable', 'public', az)
        }));

        push(novaform.ec2.Route(mknameAz('PublicRoute', az), {
            RouteTableId: routeTable,
            DestinationCidrBlock: '0.0.0.0/0',
            GatewayId: internetGateway,
        }, {
            DependsOn: internetGatewayAttachment.name,
        }));

        push(novaform.ec2.SubnetRouteTableAssociation(mknameAz('PublicSubnetRouteTableAssociation', az), {
            SubnetId: subnet,
            RouteTableId: routeTable
        }));

        var nacl = push(novaform.ec2.NetworkAcl(mknameAz('PublicNacl', az), {
            VpcId: vpc,
            Tags: mktags('Nacl', 'public', az)
        }));

        //
        // Inbound Network ACLs
        //

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [22, 22]
        }));

        // Allows inbound return traffic for requests originating in the subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundDynamicPortsTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 106,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        }));
        // Allows inbound return traffic for requests originating in the subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundDynamicPortsUdp', az), {
            NetworkAclId: nacl,
            RuleNumber: 105,
            Protocol: 17,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 104,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            Icmp: {
                Code: -1,
                Type: -1
            }
        }));

        //
        // Outound Network ACLs
        //

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [22, 22]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundDnsTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 105,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [53, 53]
        }));
        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundDnsUdp', az), {
            NetworkAclId: nacl,
            RuleNumber: 106,
            Protocol: 17,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [53, 53]
        }));

        // Allows outbound responses to clients on the Internet
        // for example, serving web pages to people visiting the web servers in the subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 104,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            Icmp: {
                Code: -1,
                Type: -1
            }
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundAnything', az), {
            NetworkAclId: nacl,
            RuleNumber: 150,
            Protocol: -1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
        }));

        push(novaform.ec2.SubnetNetworkAclAssociation(mknameAz('PublicSubnetNaclAssociation', az), {
            SubnetId: subnet,
            NetworkAclId: nacl
        }));

        return [azName, resources];
    }));

    return {
        publicResourcesPerAz: subnetsPerAz,
        allResourcesPerAz: resourcesPerAz,
    };
}

Vpc.prototype.createPrivateSubnets = function(subnets) {
    var vpc = this.vpc;

    var subnetsPerAz = {};

    var resourcesPerAz = _.object(_.map(subnets, function(cidr, azName) {
        var az = azName[azName.length - 1];

        var resources = [];
        var push = pusher(resources);

        var publicResources = subnetsPerAz[azName] = [];
        var pushPublic = pusher(publicResources);

        var subnet = pushPublic(push(novaform.ec2.Subnet(mknameAz('PrivateSubnet', az), {
            VpcId: vpc,
            AvailabilityZone: azName,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'private', az)
        })));

        var routeTable = push(novaform.ec2.RouteTable(mknameAz('PrivateRouteTable', az), {
            VpcId: vpc,
            Tags: mktags('RouteTable', 'private', az)
        }));

        push(novaform.ec2.SubnetRouteTableAssociation(mknameAz('PrivateSubnetRouteTableAssociation', az), {
            SubnetId: subnet,
            RouteTableId: routeTable
        }));

        var nacl = push(novaform.ec2.NetworkAcl(mknameAz('PrivateNacl', az), {
            VpcId: vpc,
            Tags: mktags('Nacl', 'private', az)
        }));

        //
        // Inbound Network ACLs
        //

        // Allow vpc cidr range to communicate with private subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [80, 80]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [443, 443]
        }));

        // Allows inbound return traffic from NAT instance in the public subnet for requests originating in the private subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0', // TODO: should this be vpc.properties.CidrBlock ?????
            PortRange: [1024, 65535]
        }));

        // Allow ssh from within the vpc
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [22, 22]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 104,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: vpc.properties.CidrBlock,
            Icmp: {
                Code: -1,
                Type: -1
            }
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundPostgres', az), {
            NetworkAclId: nacl,
            RuleNumber: 105,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [5432, 5432]
        }));

        //
        // Outound Network ACLs
        //

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundDnsTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 104,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [53, 53]
        }));
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundDnsUdp', az), {
            NetworkAclId: nacl,
            RuleNumber: 105,
            Protocol: 17,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [53, 53]
        }));

        // Allows outbound responses to the public subnet
        // for example, responses to web servers in the public subnet that are communicating with DB Servers in the private subnet
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: vpc.properties.CidrBlock,
            PortRange: [1024, 65535]
        }));

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: vpc.properties.CidrBlock,
            Icmp: {
                Code: -1,
                Type: -1
            }
        }));

        push(novaform.ec2.SubnetNetworkAclAssociation(mknameAz('PrivateSubnetNaclAssociation', az), {
            SubnetId: subnet,
            NetworkAclId: nacl
        }));

        return [azName, resources];
    }));

    return {
        publicResourcesPerAz: subnetsPerAz,
        allResourcesPerAz: resourcesPerAz,
    };
};

module.exports = Vpc;
