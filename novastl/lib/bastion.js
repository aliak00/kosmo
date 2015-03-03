var novaform = require('novaform')
    , _ = require('underscore');

/**
    Refs include:
    - eip: ec2.EIP
    - sg: ec2.SecurityGroup
    - sgi-icmp: ec2.SecurityGroupIngress
    - sgi-ssh: ec2.SecurityGroupIngress
    - sge-icmp: ec2.SecurityGroupEgress
    - sge-ssh: ec2.SecurityGroupIngress
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

    novaform.Template.call(this);

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

    var elasticIp = this._addResource(novaform.ec2.EIP(mkname('Eip'), {
        Domain: 'vpc',
    }, {
        DependsOn: vpc.internetGatewayAttachment.name,
    }));

    var securityGroup = this._addResource(novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpc.vpc,
        GroupDescription: 'Bastion host security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')])
        }
    }));

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: vpc.vpc.properties.CidrBlock
    }));

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: allowedSshCidr
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

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: vpc.vpc.properties.CidrBlock
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
                  'ec2:AssociateAddress'
                ],
                Resource: '*'
            }]
        }
    }));

    var instanceProfile = this._addResource(novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/bastion/']),
        Roles: [ role ]
    }));

    var launchConfiguration = this._addResource(novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [ securityGroup ],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh', {
            ASGName: name,
            LaunchConfigName: mkname('LaunchConfig'),
            EIPAllocId: novaform.getAtt(elasticIp.name, 'AllocationId')
        })),
    }, {
        DependsOn: role.name,
        Metadata: {
            'AWS::CloudFormation::Init': {
                'config': {
                    'packages': {
                        'yum': {
                            'aws-cli': []
                        }
                    }
                }
            }
        },
    }));

    var publicAvailabilityZones = _.map(vpc.publicSubnets, function(subnet) {
        return subnet.properties.AvailabilityZone;
    });

    var publicSubnets = vpc.publicSubnets;

    this._addResource(novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: publicAvailabilityZones,
        LaunchConfigurationName: launchConfiguration,
        VPCZoneIdentifier: publicSubnets,
        MinSize: 1,
        MaxSize: publicAvailabilityZones.length + 1, // 1 more for rolling update,
        DesiredCapacity: publicAvailabilityZones.length,
        Tags: {
            Application: { Value: novaform.refs.StackId, PropagateAtLaunch: true },
            Name: { Value: novaform.join('-', [novaform.refs.StackName, name]), PropagateAtLaunch: true },
            Network: { Value: 'public', PropagateAtLaunch: true },
        },
    }, {
        UpdatePolicy: {
            AutoScalingRollingUpdate: {
                MaxBatchSize: 1,
                MinInstancesInService: 1,
                PauseTime: "PT15M",
                WaitOnResourceSignals: true
            }
        },
    }));

    this.securityGroup = securityGroup;
    this.elasticIp = elasticIp;
}

Bastion.prototype = Object.create(novaform.Template.prototype);

module.exports = Bastion;
