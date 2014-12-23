var novaform = require('novaform')
    , util = require('util')
    , Template = require('./template')

/**
    Refs include:
    - vpc: ec2.VPC
    - igw: ec2.InternetGateway
    - gateway: ec2.VPCGatewayAttachment
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
        - outbound-tcp: ec2.NetworkAclEntry
        - outbound-icmp: ec2.NetworkAclEntry
        - subnet-nacl-association: ec2.SubnetNetworkAclAssociation

    For each az the private refs include:
        - subnet: ec2.Subnet
        - route-table: ec2.RouteTable
        - subnet-rt-association: ec2.SubnetRouteTableAssociation
        - nacl: ec2.NetworkAcl
        - inbound-tcp: ec2.NetworkAclEntry
        - inbound-icmp: ec2.NetworkAclEntry
        - outbound-tcp: ec2.NetworkAclEntry
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
            DependsOn: refs['gateway'].name
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

        publicRefs[az]['inbound-dynamic-ports'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundDynamicPorts', az), {
            NetworkAclId: nacl,
            RuleNumber: 102,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [1024, 65535]
        });

        publicRefs[az]['inbound-ssh'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicInboundSsh', az), {
            NetworkAclId: nacl,
            RuleNumber: 103,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            PortRange: [22, 22]
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

       publicRefs[az]['outbound-tcp'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [0, 65535]
        });

        publicRefs[az]['outbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PublicOutboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
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
            SubnetId: privateRefs['subnet'],
            RouteTableId: privateRefs['route-table']
        });

        privateRefs[az]['nacl'] = novaform.ec2.NetworkAcl(mknameAz('PrivateNacl', az), {
            VpcId: refs['vpc'],
            Tags: mktags('Nacl', 'private', az)
        });

        var nacl = privateRefs[az]['nacl'];
        privateRefs[az]['inbound-tcp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: refs['vpc'].properties.CidrBlock,
            PortRange: [0, 65536]
        });

        privateRefs[az]['inbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateInboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: false,
            CidrBlock: '0.0.0.0/0',
            Icmp: {
                Code: -1,
                Type: -1
            }
        });

       privateRefs[az]['outbound-tcp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundTcp', az), {
            NetworkAclId: nacl,
            RuleNumber: 100,
            Protocol: 6,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
            PortRange: [0, 65535]
        });

        privateRefs[az]['outbound-icmp'] = novaform.ec2.NetworkAclEntry(mknameAz('PrivateOutboundIcmp', az), {
            NetworkAclId: nacl,
            RuleNumber: 101,
            Protocol: 1,
            RuleAction: 'allow',
            Egress: true,
            CidrBlock: '0.0.0.0/0',
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

    refs['gateway'] = novaform.ec2.VPCGatewayAttachment(mkname('GatewayAttachment'), {
        VpcId: refs['vpc'],
        InternetGatewayId: refs['igw']
    });

    addPublicSubnets(refs, publicSubnetsPerAz);
    addPrivateSubnets(refs, privateSubnetsPerAz);

    this.refs = refs;
}
Vpc.prototype = Object.create(Template.prototype);

module.exports = Vpc;