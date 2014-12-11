var novaform = require('novaform')
    , util = require('util');

function Vpc(options) {
    var vpcCidr = options.cidr;
    var publicSubnets = options.publicSubnets;
    var privateSubnets = options.privateSubnets;

    var vpc = novaform.ec2.VPC('VPC', {
        CidrBlock: vpcCidr,
        EnableDnsSupport: true,
        EnableDnsHostname: true,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.refs.StackName
        }
    });

    var igw = novaform.ec2.InternetGateway('InternetGateway', {
        Tags: {
            Application: novaform.refs.StackId,
            Name: 'internet-gateway',
            Network: 'public'
        }
    });

    var igwAttachment = novaform.ec2.InternetGatewayAttachment('InternetGatwayAttachment', {
        VpcId: vpc,
        InternetGatwayId: igw
    });

    var cft = new novaform.Template();

    var publicSubnetResources = [];
    var privateSubnetResources = [];
    function addSubnetsAndNacls(subnets, visibility) {
        for (key in subnets) {
            var cidr = subnets[key];
            var az = key[key.length - 1];

            var visibilityLowerCase = visibility.toLowerCase();
            var visibilityUpperCase = visibilityLowerCase.charAt(0).toUpperCase() + visibilityLowerCase.slice(1);

            function name(str) {
                return util.format('%s%sAZ%s', visibilityUpperCase, str, az);
            }

            var subnet = novaform.ec2.Subnet(name('Subnet'), {
                VpcId: vpc,
                AvailabilityZone: key,
                CidrBlock: cidr,
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.join('-', [novaform.refs.StackName, visibilityLowerCase]),
                    Network: visibilityLowerCase
                }
            });

            if (visibilityLowerCase === 'public') {
                publicSubnetResources.push(subnet);
            } else {
                privateSubnetResources.push(subnet);
            }

            var routeTable = novaform.ec2.RouteTable(name('RouteTable'), {
                VpcId: vpc,
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.join('-', [novaform.refs.StackName, visibilityLowerCase]),
                    Network: visibilityLowerCase
                }
            });

            var route = novaform.ec2.Route(name('Route'), {
                RouteTableId: routeTable,
                DestinationCidrBlock: '0.0.0.0/0',
                GatwayId: igw,
                DependsOn: igwAttachment.name
            });

            var subnetRouteTableAssociation = novaform.ec2.SubnetRouteTableAssociation(name('SubnetRouteTableAssociation'), {
                SubnetId: subnet,
                RouteTableId: routeTable
            });

            var nacl = novaform.ec2.NetworkAcl(name('NetworkAcl'), {
                VpcId: vpc,
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.join('-', [novaform.refs.StackName, visibilityLowerCase]),
                    Network: visibilityLowerCase
                }
            });

            var naclInboundHttp = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryInboundHttp'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [80, 80]
            });

            var naclInboundHttps = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryInboundHttps'), {
                NetworkAclId: nacl,
                RuleNumber: 101,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [443, 443]
            });

            var naclInboundDynamicPorts = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryInboundDynamicPorts'), {
                NetworkAclId: nacl,
                RuleNumber: 102,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [1024, 65535]
            });

            var naclInboundSsh = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryInboundSsh'), {
                NetworkAclId: nacl,
                RuleNumber: 103,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [22, 22]
            });

            var naclInboundIcmp = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryInboundIcmp'), {
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

            var naclOutbound = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryOutbound'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: true,
                CidrBlock: '0.0.0.0/0',
                PortRange: [0, 65535]
            });

            var naclOutboundIcmp = novaform.ec2.NetworkAclEntry(name('NetworkAclEntryOutboundIcmp'), {
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

            var subnetNaclAssociation = novaform.ec2.SubnetNetworkAclAssociation(name('SubnetNetworkAclAssociation'), {
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

    var output = novaform.Output('VPC', {
        Value: vpc,
        Description: 'VPC identifier'
    });

    cft.addResource(vpc);
    cft.addResource(igw);
    cft.addResource(igwAttachment);
    cft.addOutput(output);

    vpc.publicSubnets = publicSubnetResources;
    vpc.privateSubnets = privateSubnetResources;
    vpc.igwAttachment = igwAttachment;
    vpc.template = cft;

    return vpc
}

module.exports = Vpc;