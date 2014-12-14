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
    var name = options.name || 'vpc';

    function mkname(str) {
        return name + '-' + str;
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

    var igw = novaform.ec2.InternetGateway(mkname('igw'), {
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('igw')]),
            Network: 'public'
        }
    });

    var igwAttachment = novaform.ec2.InternetGatewayAttachment(mkname('igw-attachment'), {
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

            function mknameAz(str) {
                return util.format('%s-%s-%s', mkname(str), visibilityLowerCase, azIdentifier);
            }

            function mktags(str) {
                return {
                    Application: novaform.refs.StackId,
                    Name: novaform.join('-', [novaform.refs.StackName, str]),
                    Network: visibilityLowerCase,
                    AZ: azIdentifier
                };
            }

            var subnet = novaform.ec2.Subnet(mknameAz('subnet'), {
                VpcId: vpc,
                AvailabilityZone: key,
                CidrBlock: cidr,
                Tags: mktags('subnet')
            });

            if (visibilityLowerCase === 'public') {
                publicSubnetResourcs.push(subnet);
            } else {
                privateSubnetResourcs.push(subnet);
            }

            var routeTable = novaform.ec2.RouteTable(mknameAz('rt'), {
                VpcId: vpc,
                Tags: mktags('rt')
            });

            var route = novaform.ec2.Route(mknameAz('route'), {
                RouteTableId: routeTable,
                DestinationCidrBlock: '0.0.0.0/0',
                GatwayId: igw,
                DependsOn: igwAttachment.name
            });

            var subnetRouteTableAssociation = novaform.ec2.SubnetRouteTableAssociation(mknameAz('subnet-rt-association'), {
                SubnetId: subnet,
                RouteTableId: routeTable
            });

            var nacl = novaform.ec2.NetworkAcl(mknameAz('nacl'), {
                VpcId: vpc,
                Tags: mktags('nacl')
            });

            var naclInboundHttp = novaform.ec2.NetworkAclEntry(mknameAz('nacl-ei-http'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [80, 80]
            });

            var naclInboundHttps = novaform.ec2.NetworkAclEntry(mknameAz('nacl-ei-https'), {
                NetworkAclId: nacl,
                RuleNumber: 101,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [443, 443]
            });

            var naclInboundDynamicPorts = novaform.ec2.NetworkAclEntry(mknameAz('nacl-ei-dynamic-ports'), {
                NetworkAclId: nacl,
                RuleNumber: 102,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [1024, 65535]
            });

            var naclInboundSsh = novaform.ec2.NetworkAclEntry(mknameAz('nacl-ei-ssh'), {
                NetworkAclId: nacl,
                RuleNumber: 103,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [22, 22]
            });

            var naclInboundIcmp = novaform.ec2.NetworkAclEntry(mknameAz('nacl-ei-icmp'), {
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

            var naclOutbound = novaform.ec2.NetworkAclEntry(mknameAz('nacl-eo'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: true,
                CidrBlock: '0.0.0.0/0',
                PortRange: [0, 65535]
            });

            var naclOutboundIcmp = novaform.ec2.NetworkAclEntry(mknameAz('nacl-eo-icmp'), {
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

            var subnetNaclAssociation = novaform.ec2.SubnetNetworkAclAssociation(mknameAz('subnet-nacl-association'), {
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

    var output = novaform.Output(name, {
        Value: vpc,
        Description: 'VPC identifier'
    });

    cft.addResource(vpc);
    cft.addResource(igw);
    cft.addResource(igwAttachment);

    cft.addOutput(output);

    this.resource = vpc;
    this.publicSubnets = publicSubnetResourcs;
    this.privateSubnets = privateSubnetResourcs;
    this.igwAttachment = igwAttachment;
    this.template = cft;
}
Vpc.prototype = Object.create(ResourceGroup.prototype);

module.exports = Vpc;