var novaform = require('novaform')
    , _ = require('underscore');

function Bastion(options) {
    var vpc = options.vpc;
    var allowedSshCidr = options.allowedSshCidr;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var instanceType = options.instanceType;

    var cft = novaform.Template();

    var eip = novaform.ec2.EIP('BastionElasticIP', {
        Domain: 'vpc',
        DependsOn: vpc.igwAttachment
    });

    var securityGroup = novaform.ec2.SecurityGroup('BastionInternalSecurityGroup', {
        VpcId: vpc,
        GroupDescription: 'Bastion host security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, 'bastion-internal'])
        }
    });

    var sgiIcmp = novaform.ec2.SecurityGroupIngress('BastionSGIIcmp', {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: vpc.cidrBlock
    });

    var sgiSsh = novaform.ec2.SecurityGroupIngress('BastionSGISsh', {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: allowedSshCidr
    });

    var sgeIcmp = novaform.ec2.SecurityGroupEgress('BastionSGEIcmp', {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: '0.0.0.0/0'
    });

    var sgeSsh = novaform.ec2.SecurityGroupEgress('BastionSGESsh', {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: vpc.cidrBlock
    });

    var instanceSecurityGroup = novaform.ec2.SecurityGroup('BastionToInstanceSecurityGroup', {
        VpcId: vpc,
        GroupDescription: 'Allow ssh from bastion host',
        SecurityGroupIngress: [{
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            SourceSecurityGroupId: securityGroup
        }],
        SecurityGroupEgress: [],
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, 'bastion'])
        }
    });

    var role = novaform.iam.Role('BastionIAMRole', {
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

    var rolePolicy = novaform.iam.Policy('BastionIAMRolePolicy', {
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

    var instanceProfile = novaform.iam.InstanceProfile('BastionIAMInstanceProfile', {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [role]
    });

    var launchConfig = novaform.asg.LaunchConfiguration('BastionLaunchConfiguration', {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [securityGroup],
        InstanceType: instanceType ? instanceType : 't2.micro',
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh')),
        DependsOn: role
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
    var asg = novaform.asg.AutoScalingGroup('BastionAutoScalingGroup', {
        AvailabilityZones: availabilityZones,
        LaunchConfigurationName: launchConfig,
        VPCZoneIdentifier: vpc.publicSubnets,
        MinSize: 1,
        MaxSize: availabilityZones.length + 1, // 1 more for rolling update,
        DesiredCapacity: availabilityZones.length,
        Tags: {
            Application: novaform.TagValue(novaform.refs.StackId, true),
            Name: novaform.TagValue(novaform.join('-', [novaform.refs.StackName, 'bastion']), true),
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

    cft.addResource(eip);
    cft.addResource(securityGroup);
    cft.addResource(sgiIcmp);
    cft.addResource(sgiSsh);
    cft.addResource(sgeIcmp);
    cft.addResource(sgeSsh);
    cft.addResource(instanceSecurityGroup);
    cft.addResource(role);
    cft.addResource(rolePolicy);
    cft.addResource(instanceProfile);
    cft.addResource(launchConfig);
    cft.addResource(asg);

    asg.template = cft;
    asg.instanceSecurityGroup = instanceSecurityGroup;
    return asg;
}

module.exports = Bastion;