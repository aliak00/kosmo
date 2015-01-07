var novaform = require('novaform')
    , util = require('util')
    , Template = require('./template');

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

function mknameAz(str, az) {
    return util.format('%sAZ%s', str, az);
}

function addPublicSubnets(refs, subnets) {
    refs.public = refs.public || {};
    var publicRefs = {};
    for (key in subnets) {
        var cidr = subnets[key];
        var az = key[key.length - 1];

        if (publicRefs[az]) {
            throw new Error('Multiple AZs found in vpc public subnets');
        }

        if (refs.public[az]) {
            throw new Error('AZ ' + az + ' already in vpc public refs');
        }

        publicRefs[az] = {};

        publicRefs[az]['subnet'] = novaform.ec2.Subnet(mknameAz('PublicSubnet', az), {
            VpcId: refs['vpc'],
            AvailabilityZone: key,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'public', az)
        });

        publicRefs[az]['route-table'] = novaform.ec2.RouteTable(mknameAz('PublicRouteTable', az), {
            VpcId: refs['vpc'],
            Tags: mktags('RouteTable', 'public', az)
        });

        publicRefs[az]['route'] = novaform.ec2.Route(mknameAz('PublicRoute', az), {
            RouteTableId: publicRefs[az]['route-table'],
            DestinationCidrBlock: '0.0.0.0/0',
            GatewayId: refs['igw'],
            DependsOn: refs['gateway-attachment'].name
        });

        publicRefs[az]['subnet-rt-association'] = novaform.ec2.SubnetRouteTableAssociation(mknameAz('PublicSubnetRouteTableAssociation', az), {
            SubnetId: publicRefs[az]['subnet'],
            RouteTableId: publicRefs[az]['route-table']
        });

        publicRefs[az]['nacl'] = novaform.ec2.NetworkAcl(mknameAz('PublicNacl', az), {
            VpcId: refs['vpc'],
            Tags: mktags('Nacl', 'public', az)
        });

        var nacl = publicRefs[az]['nacl'];


        //
        // Inbound Network ACLs
        //

        publicRefs[az]['inbound-http'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        });

        publicRefs[az]['inbound-https'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        });

        publicRefs[az]['inbound-ssh'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [22, 22]
        });

        // Allows inbound return traffic from requests originating in the subnet
        publicRefs[az]['inbound-dynamic-ports'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        });

        publicRefs[az]['inbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundIcmp', az), {
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
        });


        //
        // Outound Network ACLs
        //

        publicRefs[az]['outbound-http'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        });

       publicRefs[az]['outbound-https'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        });

       publicRefs[az]['outbound-ssh'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [22, 22]
        });

        // Allows outbound responses to clients on the Internet
        // for example, serving web pages to people visiting the web servers in the subnet
        publicRefs[az]['outbound-dynamic-ports'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        });

        publicRefs[az]['outbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundIcmp', az), {
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
        });

        publicRefs[az]['subnet-nacl-association'] = novaform.ec2.SubnetNetworkAclAssociation(mknameAz('PublicSubnetNaclAssociation', az), {
            SubnetId: publicRefs[az]['subnet'],
            NetworkAclId: nacl
        });
    }

    refs.public = publicRefs;
}

function addPrivateSubnets(refs, privateSubnets) {
    refs.private = refs.private || {};
    var privateRefs = {};
    for (key in privateSubnets) {
        var cidr = privateSubnets[key];
        var az = key[key.length - 1];

        if (privateRefs[az]) {
            throw new Error('Multiple AZs found in vpc private subnets');
        }

        if (refs.private[az]) {
            throw new Error('AZ ' + az + ' already in vpc private refs');
        }

        privateRefs[az] = {};

        privateRefs[az]['subnet'] = novaform.ec2.Subnet(mknameAz('PrivateSubnet', az), {
            VpcId: refs['vpc'],
            AvailabilityZone: key,
            CidrBlock: cidr,
            Tags: mktags('Subnet', 'private', az)
        });

        privateRefs[az]['route-table'] = novaform.ec2.RouteTable(mknameAz('PrivateRouteTable', az), {
            VpcId: refs['vpc'],
            Tags: mktags('RouteTable', 'private', az)
        });

        privateRefs[az]['subnet-rt-association'] = novaform.ec2.SubnetRouteTableAssociation(mknameAz('PrivateSubnetRouteTableAssociation', az), {
            SubnetId: privateRefs[az]['subnet'],
            RouteTableId: privateRefs[az]['route-table']
        });

        privateRefs[az]['nacl'] = novaform.ec2.NetworkAcl(mknameAz('PrivateNacl', az), {
            VpcId: refs['vpc'],
            Tags: mktags('Nacl', 'private', az)
        });

        var nacl = privateRefs[az]['nacl'];

        //
        // Inbound Network ACLs
        //

        // Allow vpc cidr range to communicate with private subnet
        privateRefs[az]['inbound-http'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [80, 80]
        });

        privateRefs[az]['inbound-https'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [443, 443]
        });

        // Allows inbound return traffic from NAT instance in the public subnet for requests originating in the private subnet
        privateRefs[az]['inbound-dynamic-ports'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        });

        // Allow ssh from within the vpc
        privateRefs[az]['inbound-ssh'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [22, 22]
        });

        privateRefs[az]['inbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 104,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            Icmp: {
                Code: -1,
                Type: -1
            }
        });


        //
        // Outound Network ACLs
        //

        privateRefs[az]['outbound-http'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundHttp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [80, 80]
        });

        privateRefs[az]['outbound-https'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundHttps', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [443, 443]
        });

        // Allows outbound responses to the public subnet
        // for example, responses to web servers in the public subnet that are communicating with DB Servers in the private subnet
        privateRefs[az]['outbound-dynamic-ports'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [1024, 65535]
        });

        privateRefs[az]['outbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            Icmp: {
                Code: -1,
                Type: -1
            }
        });

        privateRefs[az]['subnet-nacl-association'] = novaform.ec2.SubnetNetworkAclAssociation(mknameAz('PrivateSubnetNaclAssociation', az), {
            SubnetId: privateRefs[az]['subnet'],
            NetworkAclId: nacl
        });
    }

    refs.private = privateRefs;
}

function Vpc(options) {
    if (!(this instanceof Vpc)) {
        return new Vpc(options);
    }

    var vpcCidr = options.cidr;
    var publicSubnetsPerAz = options.publicSubnetsPerAz;
    var privateSubnetsPerAz = options.privateSubnetsPerAz;
    var name = options.name || 'Vpc';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var refs = {};

    refs['vpc'] = novaform.ec2.VPC(name, {
        CidrBlock: vpcCidr,
        EnableDnsSupport: true,
        EnableDnsHostnames: true,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, name])
        }
    });

    refs['igw'] = novaform.ec2.InternetGateway(mkname('Igw'), {
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Igw')]),
            Network: 'public'
        }
    });

    refs['gateway-attachment'] = novaform.ec2.VPCGatewayAttachment(mkname('GatewayAttachment'), {
        VpcId: refs['vpc'],
        InternetGatewayId: refs['igw']
    });

    addPublicSubnets(refs, publicSubnetsPerAz);
    addPrivateSubnets(refs, privateSubnetsPerAz);

    this.refs = refs;
}
Vpc.prototype = Object.create(Template.prototype);

module.exports = Vpc;