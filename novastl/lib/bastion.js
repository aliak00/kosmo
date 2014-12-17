var novaform = require('novaform')
    , _ = require('underscore')
    , Template = require('./template');

/**
    Template with ec2.AutoScalingGroup as the resource 

    Also returns:
    @instanceSecurityGroup: sg that allows ssh from bastion
**/

function Bastion(options) {
    if (!(this instanceof Bastion)) {
        return new Bastion(options);
    }

    var vpcTemplate = options.vpcTemplate;;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'Bastion';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var rg = novaform.ResourceGroup();

    var eip = novaform.ec2.EIP(mkname('Eip'), {
        Domain: 'vpc',
        DependsOn: vpcTemplate.gatewayAttachment
    });

    var securityGroup = novaform.ec2.SecurityGroup(mkname('InternalSg'), {
        VpcId: vpcTemplate.resource,
        GroupDescription: 'Bastion host security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('InternalSg')])
        }
    });

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

    var sgeIcmp = novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: '0.0.0.0/0'
    });

    var sgeSsh = novaform.ec2.SecurityGroupEgress(mkname('SgeSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: vpcTemplate.cidrBlock
    });

    var instanceSecurityGroup = novaform.ec2.SecurityGroup(mkname('ToInstanceSg'), {
        VpcId: vpcTemplate.resource,
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
            Name: novaform.join('-', [novaform.refs.StackName, mkname('ToInstanceSg')])
        }
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
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh', {
            ASGName: name,
            LaunchConfigName: mkname('LaunchConfig'),
            EIP: novaform.getAtt(eip.name, 'AllocationId')
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

    rg.add(eip);
    rg.add(securityGroup);
    rg.add(sgiIcmp);
    rg.add(sgiSsh);
    rg.add(sgeIcmp);
    rg.add(sgeSsh);
    rg.add(instanceSecurityGroup);
    rg.add(role);
    rg.add(rolePolicy);
    rg.add(instanceProfile);
    rg.add(launchConfig);
    rg.add(asg);

    this.resource = asg;
    this.resourceGroup = rg;
    this.instanceSecurityGroup = instanceSecurityGroup;
}

Bastion.prototype = Object.create(Template.prototype);

module.exports = Bastion;