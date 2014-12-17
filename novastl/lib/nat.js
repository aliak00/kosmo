var novaform = require('novaform')
    , util = require('util')
    , _ = require('underscore')
    , Template = require('./template');

/**
    Template with ec2.AutoScalingGroup as the resource object
**/

function Nat(options) {
    if (!(this instanceof Nat)) {
        return new Nat(options);
    }

    var vpcTemplate = options.vpcTemplate;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'Nat';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var rg = novaform.ResourceGroup();

    var securityGroup = novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpcTemplate.resource,
        GroupDescription: vpcTemplate.resource.name + ' NAT security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')]),
            Network: 'public'
        }
    });

    for (i in vpcTemplate.privateSubnets) {
        var subnet = vpcTemplate.privateSubnets[i];
        var cidr = subnet.cidrBlock;
        var az = subnet.availabilityZone;

        var azIdentifier = az[az.length - 1];

        function mknameAz(str) {
            return util.format('%sAZ%s', mkname(str), azIdentifier);
        }

        var sgiHttp = novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpPrivate'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: cidr
        });

        var sgiHttps = novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpsPrivate'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: cidr
        });

        rg.add(sgiHttp);
        rg.add(sgiHttps);
    }

    var sgiIcmp = novaform.ec2.SecurityGroupIngress(mkname('SgiIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: vpcTemplate.cidrBlock
    });

    var sgiSsh = novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: allowedSshCidr
    });

    var sgeHttp = novaform.ec2.SecurityGroupEgress(mkname('SgeHttp'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0'
    });

    var sgeHttps = novaform.ec2.SecurityGroupEgress(mkname('SgeHttps'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0'
    });

    var sgeIcmp = novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0'
    });

    var role = novaform.iam.Role(mkname('IAmRole'), {
        AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Principal: {
                    Service: [ 'ec2.amazonovaform.com' ]
                },
                Action: [ 'sts:AssumeRole' ]
            }]
        },
        Path: '/'
    });

    var rolePolicy = novaform.iam.Policy(mkname('IAmRolePolicy'), {
        PolicyName: 'root',
        Roles: [role],
        PolicyDocument: {
            Version : '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: [
                    'ec2:ModifyInstanceAttribute',
                    'ec2:DescribeSubnets',
                    'ec2:DescribeRouteTables',
                    'ec2:CreateRoute',
                    'ec2:ReplaceRoute'
                ],
                Resource: '*'
            }]
        }
    });

    var instanceProfile = novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [role]
    });

    var launchConfig = novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [securityGroup],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/nat-user-data.sh', {
            ASGName: name,
            VPCName: vpcTemplate.resource.name,
            LaunchConfigName: mkname('LaunchConfig'),
        }))
    }, {
        'AWS::CloudFormation::Init': {
            'config': {
                'packages': {
                    'yum': {
                        'aws-cli': []
                    }
                }
            }
        }
    });

    var availabilityZones = _.pluck(vpcTemplate.publicSubnets, 'availabilityZone');
    var asg = novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: availabilityZones,
        LaunchConfigurationName: launchConfig,
        VPCZoneIdentifier: vpcTemplate.publicSubnets,
        MinSize: 1,
        MaxSize: availabilityZones.length + 1, // 1 more for rolling update,
        DesiredCapacity: availabilityZones.length,
        Tags: {
            Application: novaform.TagValue(novaform.refs.StackId, true),
            Name: novaform.TagValue(novaform.join('-', [novaform.refs.StackName, name]), true),
            Network: novaform.TagValue('public', true)
        },
        UpdatePolicy: {
            AutoScalingRollingUpdate: {
                MaxBatchSize: 1,
                MinInstancesInService: 1,
                PauseTime: "PT15M",
                WaitOnResourceSignals: true
            }
        }
    });

    rg.add(securityGroup);
    rg.add(sgiIcmp);
    rg.add(sgiSsh);
    rg.add(sgeHttp);
    rg.add(sgeHttps);
    rg.add(sgeIcmp);
    rg.add(role);
    rg.add(rolePolicy);
    rg.add(instanceProfile);
    rg.add(launchConfig);
    rg.add(asg);

    this.resource = asg;
    this.resourceGroup = rg;
}
Nat.prototype = Object.create(Template.prototype);

module.exports = Nat;