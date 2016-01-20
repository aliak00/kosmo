var Template = require('../template')
    , novaform = require('../../../novaform')
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

    this._publicSubnetResourcesPerAz = publicSubnet.subnetsPerAz;
    this._privateSubnetResourcesPerAz = privateSubnet.subnetsPerAz;

    this.publicSubnetsPerAz = publicSubnet.subnetsPerAz;
    this.privateSubnetsPerAz = privateSubnet.subnetsPerAz;

    this.publicSubnets = _.flatten(_.values(publicSubnet.subnetsPerAz));
    this.privateSubnets = _.flatten(_.values(privateSubnet.subnetsPerAz));

    this.publicRouteTablesPerAz = publicSubnet.routeTablesPerAz;
    this.privateRouteTablesPerAz = privateSubnet.routeTablesPerAz;

    this.publicRouteTables = _.flatten(_.values(publicSubnet.routeTablesPerAz));
    this.privateRouteTables = _.flatten(_.values(privateSubnet.routeTablesPerAz));

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
    var routeTablesPerAz = {};

    var resourcesPerAz = _.object(_.map(subnets, function(cidr, azName) {
        var az = azName[azName.length - 1];

        var resources = [];
        var push = pusher(resources);

        var subnetResources = subnetsPerAz[azName] = [];
        var pushSubnet = pusher(subnetResources);

        var routeTableResources = routeTablesPerAz[azName] = [];
        var pushRouteTable = pusher(routeTableResources);

        var subnet = pushSubnet(push(novaform.ec2.Subnet(mknameAz('PublicSubnet', az), {
            VpcId: vpc,
            AvailabilityZone: azName,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'public', az)
        })));

        var routeTable = pushRouteTable(push(novaform.ec2.RouteTable(mknameAz('PublicRouteTable', az), {
            VpcId: vpc,
            Tags: mktags('RouteTable', 'public', az)
        })));

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

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundAllowAll', az), {
            NetworkAclId: nacl,
            RuleNumber: 199,
            Protocol: -1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
        }));

        //
        // Outound Network ACLs
        //

        push(novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundAllowAll', az), {
            NetworkAclId: nacl,
            RuleNumber: 199,
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
        subnetsPerAz: subnetsPerAz,
        routeTablesPerAz: routeTablesPerAz,
        allResourcesPerAz: resourcesPerAz,
    };
}

Vpc.prototype.createPrivateSubnets = function(subnets) {
    var vpc = this.vpc;

    var subnetsPerAz = {};
    var routeTablesPerAz = {};

    var resourcesPerAz = _.object(_.map(subnets, function(cidr, azName) {
        var az = azName[azName.length - 1];

        var resources = [];
        var push = pusher(resources);

        var subnetResources = subnetsPerAz[azName] = [];
        var pushSubnet = pusher(subnetResources);

        var routeTableResources = routeTablesPerAz[azName] = [];
        var pushRouteTable = pusher(routeTableResources);

        var subnet = pushSubnet(push(novaform.ec2.Subnet(mknameAz('PrivateSubnet', az), {
            VpcId: vpc,
            AvailabilityZone: azName,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'private', az)
        })));

        var routeTable = pushRouteTable(push(novaform.ec2.RouteTable(mknameAz('PrivateRouteTable', az), {
            VpcId: vpc,
            Tags: mktags('RouteTable', 'private', az)
        })));

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
        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundAllowAll', az), {
            NetworkAclId: nacl,
            RuleNumber: 199,
            Protocol: -1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
        }));

        //
        // Outound Network ACLs
        //

        push(novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundAllowAll', az), {
            NetworkAclId: nacl,
            RuleNumber: 199,
            Protocol: -1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
        }));

        push(novaform.ec2.SubnetNetworkAclAssociation(mknameAz('PrivateSubnetNaclAssociation', az), {
            SubnetId: subnet,
            NetworkAclId: nacl
        }));

        return [azName, resources];
    }));

    return {
        subnetsPerAz: subnetsPerAz,
        routeTablesPerAz: routeTablesPerAz,
        allResourcesPerAz: resourcesPerAz,
    };
};

module.exports = Vpc;
