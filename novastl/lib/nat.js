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

    Template.call(this);

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

    var self = this;

    var securityGroup = this._addResource(novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpc.vpc,
        GroupDescription: name + ' security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')])
        }
    }));

    vpc.privateSubnets.forEach(function(subnet) {
        var cidr = subnet.properties.CidrBlock;
        var availabilityZone = subnet.properties.AvailabilityZone;
        var az = availabilityZone[availabilityZone.length - 1];

        function mknameAz(str) {
            return util.format('%sAZ%s', mkname(str), az);
        }

        self._addResource(novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpPrivate'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: cidr
        }));

        self._addResource(novaform.ec2.SecurityGroupIngress(mknameAz('SgiHttpsPrivate'), {
            GroupId: securityGroup,
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: cidr
        }));
    });

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: allowedSshCidr
    }));

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: vpc.vpc.properties.CidrBlock
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeHttp'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0'
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeHttps'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0'
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0'
    }));

    var role = this._addResource(novaform.iam.Role(mkname('IAmRole'), {
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

    this._addResource(novaform.iam.Policy(mkname('IAmRolePolicy'), {
        PolicyName: 'root',
        Roles: [ role ],
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

    var instanceProfile = this._addResource(novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/nat/']),
        Roles: [ role ]
    }));

    var launchConfiguration = this._addResource(novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [ securityGroup ],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/nat-user-data.sh', {
            ASGName: name,
            VPCNameRef: novaform.ref(vpc.vpc.name),
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

    var publicAvailabilityZones = _.map(vpc.publicSubnets, function(subnet) {
        return subnet.properties.AvailabilityZone;
    });

    var publicSubnets = vpc.publicSubnets;

    var autoScalingGroup = this._addResource(novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: publicAvailabilityZones,
        LaunchConfigurationName: launchConfiguration,
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

    this.securityGroup = securityGroup;
    this.autoScalingGroup = autoScalingGroup;
}
Nat.prototype = Object.create(Template.prototype);

module.exports = Nat;