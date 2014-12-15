var novaform = require('novaform')
    , util = require('util')
    , ResourceGroup = require('./resource-group')

/**
    ResourceGroup with ec2.VPC as the resource object

    Also returns:
    @publicSubnets: array of public subnets
    @privateSubnets: array of private subnets
    @igwAttachment: the internet gateway attachment
**/

function Vpc(options) {
    if (!(this instanceof Vpc)) {
        return new Vpc(options);
    }

    var vpcCidr = options.cidr;
    var publicSubnets = options.publicSubnets;
    var privateSubnets = options.privateSubnets;
    var name = options.name || 'Vpc';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var vpc = novaform.ec2.VPC(name, {
        CidrBlock: vpcCidr,
        EnableDnsSupport: true,
        EnableDnsHostname: true,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, name])
        }
    });

    var igw = novaform.ec2.InternetGateway(mkname('Igw'), {
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Igw')]),
            Network: 'public'
        }
    });

    var gatewayAttachment = novaform.ec2.VPCGatewayAttachment(mkname('VpcGwAttachment'), {
        VpcId: vpc,
        InternetGatwayId: igw
    });

    var cft = new novaform.Template();

    var publicSubnetResourcs = [];
    var privateSubnetResourcs = [];
    function addSubnetsAndNacls(subnets, visibility) {
        for (key in subnets) {
            var cidr = subnets[key];
            var azIdentifier = key[key.length - 1];

            var visibilityLowerCase = visibility.toLowerCase();
            var visibilityUpperCase = visibilityLowerCase.charAt(0).toUpperCase() + visibilityLowerCase.slice(1);

            function mknameAz(str) {
                return util.format('%s%sAZ%s', mkname(str), visibilityUpperCase, azIdentifier);
            }

            function mktags(str) {
                return {
                    Application: novaform.refs.StackId,
                    Name: novaform.join('-', [novaform.refs.StackName, str]),
                    Network: visibilityLowerCase,
                    AZ: azIdentifier
                };
            }

            var subnet = novaform.ec2.Subnet(mknameAz('Subnet'), {
                VpcId: vpc,
                AvailabilityZone: key,
                CidrBlock: cidr,
                Tags: mktags('Subnet')
            });

            if (visibilityLowerCase === 'public') {
                publicSubnetResourcs.push(subnet);
            } else {
                privateSubnetResourcs.push(subnet);
            }

            var routeTable = novaform.ec2.RouteTable(mknameAz('RouteTable'), {
                VpcId: vpc,
                Tags: mktags('RouteTable')
            });

            var route = novaform.ec2.Route(mknameAz('Route'), {
                RouteTableId: routeTable,
                DestinationCidrBlock: '0.0.0.0/0',
                GatwayId: igw,
                DependsOn: gatewayAttachment.name
            });

            var subnetRouteTableAssociation = novaform.ec2.SubnetRouteTableAssociation(mknameAz('SubnetRouteTableAssociation'), {
                SubnetId: subnet,
                RouteTableId: routeTable
            });

            var nacl = novaform.ec2.NetworkAcl(mknameAz('Nacl'), {
                VpcId: vpc,
                Tags: mktags('Nacl')
            });

            var naclInboundHttp = novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressHttp'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [80, 80]
            });

            var naclInboundHttps = novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressHttps'), {
                NetworkAclId: nacl,
                RuleNumber: 101,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [443, 443]
            });

            var naclInboundDynamicPorts = novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressDynamicPorts'), {
                NetworkAclId: nacl,
                RuleNumber: 102,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [1024, 65535]
            });

            var naclInboundSsh = novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressSsh'), {
                NetworkAclId: nacl,
                RuleNumber: 103,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [22, 22]
            });

            var naclInboundIcmp = novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressIcmp'), {
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

            var naclOutbound = novaform.ec2.NetworkAclEntry(mknameAz('NaclEgress'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: true,
                CidrBlock: '0.0.0.0/0',
                PortRange: [0, 65535]
            });

            var naclOutboundIcmp = novaform.ec2.NetworkAclEntry(mknameAz('NaclEgressIcmp'), {
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

            var subnetNaclAssociation = novaform.ec2.SubnetNetworkAclAssociation(mknameAz('SubnetNaclAssociation'), {
                SubnetId: subnet,
                NetworkAclId: nacl
            });

            cft.addResource(subnet);
            cft.addResource(routeTable);
            cft.addResource(route);
            cft.addResource(subnetRouteTableAssociation);
            cft.addResource(nacl);
            cft.addResource(naclInboundHttp);
            cft.addResource(naclInboundHttps);
            cft.addResource(naclInboundDynamicPorts);
            cft.addResource(naclInboundSsh);
            cft.addResource(naclInboundIcmp);
            cft.addResource(naclOutbound);
            cft.addResource(naclOutboundIcmp);
            cft.addResource(subnetNaclAssociation);
        }
    }

    addSubnetsAndNacls(publicSubnets, 'public');
    addSubnetsAndNacls(privateSubnets, 'private');

    cft.addResource(vpc);
    cft.addResource(igw);
    cft.addResource(gatewayAttachment);

    this.resource = vpc;
    this.publicSubnets = publicSubnetResourcs;
    this.privateSubnets = privateSubnetResourcs;
    this.gatewayAttachment = gatewayAttachment;
    this.template = cft;
}
Vpc.prototype = Object.create(ResourceGroup.prototype);

module.exports = Vpc;