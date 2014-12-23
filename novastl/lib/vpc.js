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

    For each az per public and private array we have the following refs:
        - subnet: ec2.Subnet
        - route-table: ec2.RouteTable
        - subnet-rt-association: ec2.SubnetRouteTableAssociation
        - nacl: ec2.NetworkAcl
        - nacl-ingress-http: ec2.NetworkAclEntry
        - nacl-ingress-https: ec2.NetworkAclEntry
        - nacl-ingress-dynamic-ports: ec2.NetworkAclEntry
        - nacl-ingress-ssh: ec2.NetworkAclEntry
        - nacl-ingress-icmp: ec2.NetworkAclEntry
        - nacl-egress: ec2.NetworkAclEntry
        - nacl-egress-icmp: ec2.NetworkAclEntry
        - subnet-nacl-association: ec2.SubnetNetworkAclAssociation
**/

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

    function addSubnetsAndNacls(subnets, visibility) {
        for (key in subnets) {
            var cidr = subnets[key];
            var azIdentifier = key[key.length - 1];
            var visibilityLowerCase = visibility.toLowerCase();
            var visibilityUpperCase = visibilityLowerCase.charAt(0).toUpperCase() + visibilityLowerCase.slice(1);

            refs[visibilityLowerCase] = refs[visibilityLowerCase] || {};
            refs[visibilityLowerCase][azIdentifier] = refs[visibilityLowerCase][azIdentifier] || {};

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

            function ref(key) {
                return refs[visibilityLowerCase][azIdentifier][key];
            }

            function addref(key, value) {
                if (ref(key)) {
                    throw new Error('Cannot have duplicate ' + visibilityLowerCase + ' key in Template refs');
                }
                refs[visibilityLowerCase][azIdentifier][key] = value;
            }

            addref('subnet', novaform.ec2.Subnet(mknameAz('Subnet'), {
                VpcId: refs['vpc'],
                AvailabilityZone: key,
                CidrBlock: cidr,
                Tags: mktags('Subnet')
            }));

            addref('route-table', novaform.ec2.RouteTable(mknameAz('RouteTable'), {
                VpcId: refs['vpc'],
                Tags: mktags('RouteTable')
            }));

            addref('route', novaform.ec2.Route(mknameAz('Route'), {
                RouteTableId: ref('route-table'),
                DestinationCidrBlock: '0.0.0.0/0',
                GatewayId: refs['igw'],
                DependsOn: refs['gateway'].name
            }));

            addref('subnet-rt-association',  novaform.ec2.SubnetRouteTableAssociation(mknameAz('SubnetRouteTableAssociation'), {
                SubnetId: ref('subnet'),
                RouteTableId: ref('route-table')
            }));

            addref('nacl', novaform.ec2.NetworkAcl(mknameAz('Nacl'), {
                VpcId: refs['vpc'],
                Tags: mktags('Nacl')
            }));

            var nacl = ref('nacl');
            addref('nacl-ingress-http', novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressHttp'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [80, 80]
            }));

            addref('nacl-ingress-https', novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressHttps'), {
                NetworkAclId: nacl,
                RuleNumber: 101,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [443, 443]
            }));

            addref('nacl-ingress-dynamic-ports', novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressDynamicPorts'), {
                NetworkAclId: nacl,
                RuleNumber: 102,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [1024, 65535]
            }));

            addref('nacl-ingress-ssh', novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressSsh'), {
                NetworkAclId: nacl,
                RuleNumber: 103,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
                PortRange: [22, 22]
            }));

            addref('nacl-ingress-icmp', novaform.ec2.NetworkAclEntry(mknameAz('NaclIngressIcmp'), {
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

           addref('nacl-egress', novaform.ec2.NetworkAclEntry(mknameAz('NaclEgress'), {
                NetworkAclId: nacl,
                RuleNumber: 100,
                Protocol: 6,
                RuleAction: 'allow',
                Egress: true,
                CidrBlock: '0.0.0.0/0',
                PortRange: [0, 65535]
            }));

            addref('nacl-egress-icmp', novaform.ec2.NetworkAclEntry(mknameAz('NaclEgressIcmp'), {
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
            }));

            addref('subnet-nacl-association', novaform.ec2.SubnetNetworkAclAssociation(mknameAz('SubnetNaclAssociation'), {
                SubnetId: ref('subnet'),
                NetworkAclId: nacl
            }));
        }
    }

    addSubnetsAndNacls(publicSubnets, 'public');
    addSubnetsAndNacls(privateSubnets, 'private');

    this.refs = refs;
}
Vpc.prototype = Object.create(Template.prototype);

module.exports = Vpc;