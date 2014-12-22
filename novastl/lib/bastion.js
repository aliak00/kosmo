var novaform = require('novaform')
    , _ = require('underscore')
    , Template = require('./template');

/**
    Refs include:
    - eip: ec2.EIP
    - internal-sg: ec2.SecurityGroup
    - sgi-icmp: ec2.SecurityGroupIngress
    - sgi-ssh: ec2.SecurityGroupIngress
    - sge-icmp: ec2.SecurityGroupEgress
    - sge-ssh: ec2.SecurityGroupIngress
    - instance-sg: ec2.SecurityGroup
    - role: iam.Role
    - policy: iam.Policy
    - instance-profile: iam.InstanceProfile
    - launch-config: ec2.SecurityGroup
    - asg: ec2.SecurityGroup
**/

function Bastion(options) {
    if (!(this instanceof Bastion)) {
        return new Bastion(options);
    }

    var vpc = options.vpc;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'Bastion';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var refs = {};
    function addref(key, value) {
        if (refs[key]) {
            throw new Error('Cannot add duplicate key: ' + key);
        }
        refs[key] = value;
    }

    addref('eip', novaform.ec2.EIP(mkname('Eip'), {
        Domain: 'vpc',
        DependsOn: vpc.refs['gatewayAttachment']
    }));

    addref('internal-sg', novaform.ec2.SecurityGroup(mkname('InternalSg'), {
        VpcId: vpc.refs['vpc'],
        GroupDescription: 'Bastion host security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('InternalSg')])
        }
    }));

    addref('sgi-icmp', novaform.ec2.SecurityGroupIngress(mkname('SgiIcmp'), {
        GroupId: refs['internal-sg'],
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1, 
        CidrIp: vpc.refs['vpc'].properties.CidrBlock
    }));

    addref('sgi-ssh', novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: refs['internal-sg'],
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: allowedSshCidr
    }));

    addref('sge-icmp', novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: refs['internal-sg'],
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0'
    }));

    addref('sge-ssh', novaform.ec2.SecurityGroupEgress(mkname('SgeSsh'), {
        GroupId: refs['internal-sg'],
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22, 
        CidrIp: vpc.refs['vpc'].properties.CidrBlock
    }));

    addref('instance-sg', novaform.ec2.SecurityGroup(mkname('ToInstanceSg'), {
        VpcId: vpc.refs['vpc'],
        GroupDescription: 'Allow ssh from bastion host',
        SecurityGroupIngress: [{
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            SourceSecurityGroupId: refs['internal-sg']
        }],
        SecurityGroupEgress: [],
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('ToInstanceSg')])
        }
    }));

    addref('role', novaform.iam.Role(mkname('IAmRole'), {
        AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Principal: {
                    Service: [ 'ec2.amazonaws.com' ]
                },
                Action: [ 'sts:AssumeRole' ]
            }]
        },
        Path: '/'
    }));

    addref('policy', novaform.iam.Policy(mkname('IAmRolePolicy'), {
        PolicyName: 'root',
        Roles: [refs['role']],
        PolicyDocument: {
            Version : '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: [
                  'ec2:AssociateAddress'
                ],
                Resource: '*'
            }]
        }
    }));

    addref('instance-profile', novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/bastion/']),
        Roles: [refs['role']]
    }));

    addref('launch-config', novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [refs['internal-sg']],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: refs['instance-profile'],
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh', {
            ASGName: name,
            LaunchConfigName: mkname('LaunchConfig'),
            EIP: novaform.getAtt(refs['eip'].name, 'AllocationId')
        })),
        DependsOn: refs['role'].name
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
    }));

    var publicAvailabilityZones = _.map(vpc.refs.public, function(az) {
        return az.subnet.properties.AvailabilityZone;
    });

    var publicSubnets = _.map(vpc.refs.public, function(az) {
        return az.subnet
    });

    addref('asg', novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: publicAvailabilityZones,
        LaunchConfigurationName: refs['launch-config'],
        VPCZoneIdentifier: publicSubnets,
        MinSize: 1,
        MaxSize: publicAvailabilityZones.length + 1, // 1 more for rolling update,
        DesiredCapacity: publicAvailabilityZones.length,
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
    }));

    this.refs = refs;
}

Bastion.prototype = Object.create(Template.prototype);

module.exports = Bastion;