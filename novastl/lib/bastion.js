var novaform = require('novaform')
    , _ = require('underscore')
    , ResourceGroup = require('./resource-group');

/**
    ResourceGroup with ec2.AutoScalingGroup as the resource object
**/

function Bastion(options) {
    if (!(this instanceof Bastion)) {
        return new Bastion(options);
    }

    var vpc = options.vpc.resource;;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'bastion';

    function mkname(str) {
        return name + '-' + str;
    }

    var cft = novaform.Template();

    var eip = novaform.ec2.EIP(mkname('eip'), {
        Domain: 'vpc',
        DependsOn: vpc.gatewayAttachment
    });

    var securityGroup = novaform.ec2.SecurityGroup(mkname('internal-sg'), {
        VpcId: vpc,
        GroupDescription: 'Bastion host security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('internal-sg')])
        }
    });

    var sgiIcmp = novaform.ec2.SecurityGroupIngress(mkname('sgi-icmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: vpc.cidrBlock
    });

    var sgiSsh = novaform.ec2.SecurityGroupIngress(mkname('sgi-ssh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: allowedSshCidr
    });

    var sgeIcmp = novaform.ec2.SecurityGroupEgress(mkname('sge-icmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: '0.0.0.0/0'
    });

    var sgeSsh = novaform.ec2.SecurityGroupEgress(mkname('sge-ssh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: vpc.cidrBlock
    });

    var instanceSecurityGroup = novaform.ec2.SecurityGroup(mkname('to-instance-sg'), {
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
            Name: novaform.join('-', [novaform.refs.StackName, mkname('to-instance-sg')])
        }
    });

    var role = novaform.iam.Role(mkname('iam-role'), {
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

    var rolePolicy = novaform.iam.Policy(mkname('iam-role-policy'), {
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

    var instanceProfile = novaform.iam.InstanceProfile(mkname('iam-instance-profile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [role]
    });

    var launchConfig = novaform.asg.LaunchConfiguration(mkname('launch-config'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [securityGroup],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh', {
            ASGName: name,
            LaunchConfig: mkname('launch-config'),
            EIP: novaform.getAttr(eip.name, 'AllocationId')
        })),
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
    var asg = novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: availabilityZones,
        LaunchConfigurationName: launchConfig,
        VPCZoneIdentifier: vpc.publicSubnets,
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
Bastion.prototype = Object.create(ResourceGroup.prototype);

module.exports = Bastion;