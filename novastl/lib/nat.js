var novaform = require('novaform')
    , util = require('util')
    , _ = require('underscore');

function Nat(options) {
    var vpc = options.vpc;
    var allowedSshCidr = options.allowedSshCidr;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var instanceType = options.instanceType;

    var cft = novaform.Template();

    var securityGroup = novaform.ec2.SecurityGroup('NatSecurityGroup', {
        VpcId: vpc,
        GroupDescription: 'NAT security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, 'nat']),
            Network: 'public'
        }
    });

    for (i in vpc.privateSubnets) {
        var subnet = vpc.privateSubnets[i]
        var cidr = subnet.cidrBlock;
        var az = subnet.availabilityZone;

        var azIdentifier = az[az.length - 1];
        function name(str) {
            return util.format('%sAZ%s', str, azIdentifier);
        }

        var sgiHttp = novaform.ec2.SecurityGroupIngress(name('PrivateSubnetNatSGIHttp'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: cidr
        });

        var sgiHttps = novaform.ec2.SecurityGroupIngress(name('PrivateSubnetNatSGIHttps'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: cidr
        });

        cft.addResource(sgiHttp);
        cft.addResource(sgiHttps);
    }

    var sgiIcmp = novaform.ec2.SecurityGroupIngress('NatSGIIcmp', {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: vpc.cidrBlock
    });

    if (allowedSshCidr) {
        var sgiSsh = novaform.ec2.SecurityGroupIngress('NatSGISsh', {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            CidrIp: allowedSshCidr
        });
        cft.addResource(sgiSsh);
    }

    var sgeHttp = novaform.ec2.SecurityGroupEgress('NatSGEHttp', {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0'
    });

    var sgeHttps = novaform.ec2.SecurityGroupEgress('NatSGEHttps', {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0'
    });

    var sgeIcmp = novaform.ec2.SecurityGroupEgress('NatSGEIcmp', {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0'
    });

    var role = novaform.iam.Role('NatIAMRole', {
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

    var rolePolicy = novaform.iam.Policy('NatIAMRolePolicy', {
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

    var instanceProfile = novaform.iam.InstanceProfile('NatIAMInstanceProfile', {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [role]
    });

    var launchConfig = novaform.asg.LaunchConfiguration('NatLaunchConfiguration', {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [securityGroup],
        InstanceType: instanceType ? instanceType : 't2.micro',
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/nat-user-data.sh'))
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

    var availabilityZones = _.pluck(vpc.publicSubnets, 'availabilityZone');
    var asg = novaform.asg.AutoScalingGroup('NatAutoScalingGroup', {
        AvailabilityZones: availabilityZones,
        LaunchConfigurationName: launchConfig,
        VPCZoneIdentifier: vpc.publicSubnets,
        MinSize: 1,
        MaxSize: availabilityZones.length + 1, // 1 more for rolling update,
        DesiredCapacity: availabilityZones.length,
        Tags: {
            Application: novaform.TagValue(novaform.refs.StackId, true),
            Name: novaform.TagValue(novaform.join('-', [novaform.refs.StackName, 'nat']), true),
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

    cft.addResource(securityGroup);
    cft.addResource(sgiIcmp);
    cft.addResource(sgeHttp);
    cft.addResource(sgeHttps);
    cft.addResource(sgeIcmp);
    cft.addResource(role);
    cft.addResource(rolePolicy);
    cft.addResource(instanceProfile);
    cft.addResource(launchConfig);
    cft.addResource(asg);

    asg.template = cft;
    return asg;
}

module.exports = Nat;