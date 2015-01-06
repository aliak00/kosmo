var novaform = require('novaform')
    , util = require('util')
    , _ = require('underscore')
    , Template = require('./template');

/**
    Refs include:
    - sg: ec2.SecurityGroup
    - sgi-icmp: ec2.SecurityGroupIngress
    - sgi-ssh: ec2.SecurityGroupIngress
    - sge-http: ec2.SecurityGroupEgress
    - sge-https: ec2.SecurityGroupEgress
    - sge-icmp: ec2.SecurityGroupEgress
    - role: iam.Role
    - policy: iam.Policy
    - instance-profile: iam.InstanceProfile
    - launch-config: ec2.SecurityGroup
    - asg: ec2.SecurityGroup
    - private: {az: {private refs per az}}

    For each az per public and private array we have the following refs:
        - sgi-http: ec2.SecurityGroupIngress
        - sgi-https: ec2.SecurityGroupIngress
**/

function Nat(options) {
    if (!(this instanceof Nat)) {
        return new Nat(options);
    }

    var vpc = options.vpc;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'Nat';

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

    addref('sg', novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpc.refs['vpc'],
        GroupDescription: name + ' security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')]),
            Network: 'public'
        }
    }));

    var subnetsPerAZ = _.map(vpc.refs.private, function(az) {
        return az.subnet;
    });

    for (i in subnetsPerAZ) {
        var subnet = subnetsPerAZ[i];
        var cidr = subnet.properties.CidrBlock;
        var availabilityZone = subnet.properties.AvailabilityZone;
        var azIdentifier = availabilityZone[availabilityZone.length - 1];

        refs.private = refs.private || {};
        refs.private[azIdentifier] = refs.private[azIdentifier] || {};

        function mknameAz(str) {
            return util.format('%sAZ%s', mkname(str), azIdentifier);
        }

        refs.private[azIdentifier]['sgi-http'] = novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpPrivate'), {
            GroupId: refs['sg'],
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: cidr
        });

        refs.private[azIdentifier]['sgi-https'] = novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpsPrivate'), {
            GroupId: refs['sg'],
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: cidr
        });
    }

    addref('sgi-ssh', novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: refs['sg'],
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: allowedSshCidr
    }));

    addref('sgi-icmp', novaform.ec2.SecurityGroupIngress(mkname('SgiIcmp'), {
        GroupId: refs['sg'],
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: vpc.refs['vpc'].properties.CidrBlock
    }));

    addref('sge-http', novaform.ec2.SecurityGroupEgress(mkname('SgeHttp'), {
        GroupId: refs['sg'],
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0'
    }));

    addref('sge-https', novaform.ec2.SecurityGroupEgress(mkname('SgeHttps'), {
        GroupId: refs['sg'],
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0'
    }));

    addref('sge-icmp', novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: refs['sg'],
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0'
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
                    'ec2:ModifyInstanceAttribute',
                    'ec2:DescribeSubnets',
                    'ec2:DescribeRouteTables',
                    'ec2:CreateRoute',
                    'ec2:ReplaceRoute'
                ],
                Resource: '*'
            }]
        }
    }));

    addref('instance-profile', novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [refs['role']]
    }));

    addref('launch-config', novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [refs['sg']],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: refs['instance-profile'],
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/nat-user-data.sh', {
            ASGName: name,
            VPCNameRef: novaform.ref(vpc.refs['vpc'].name),
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
Nat.prototype = Object.create(Template.prototype);

module.exports = Nat;