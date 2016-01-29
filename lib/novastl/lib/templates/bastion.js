var Vpc = require('../templates/vpc')
    , Template = require('../template')
    , novaform = require('../../../novaform')
    , _ = require('lodash')
    , yaml = require('js-yaml')
    , multipart = require('mime-multipart');

function Bastion(options) {
    if (!(this instanceof Bastion)) {
        return new Bastion(options);
    }

    Template.call(this);

    var vpc = options.vpc;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var allowedSshCidr = options.allowedSshCidr || '0.0.0.0/0'
    var instanceType = options.instanceType || 't2.micro';
    var name = options.name || 'Bastion';
    var users = options.users;

    var vpcIsTemplate = vpc instanceof Vpc;
    var vpcResource = vpcIsTemplate
        ? vpc.vpc
        : vpc;
    var vpcCidrBlock = vpcIsTemplate
        ? vpc.vpc.properties.CidrBlock
        : options.vpcCidrBlock || '0.0.0.0/0';
    var vpcPublicSubnets = vpcIsTemplate
        ? vpc.publicSubnets
        : options.vpcPublicSubnets;
    var vpcPublicAvailabilityZones = vpcIsTemplate
        ? _.map(vpcPublicSubnets, 'properties.AvailabilityZone')
        : options.vpcPublicAvailabilityZones;

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var eipAttributes = vpcIsTemplate
        ? { DependsOn: vpc.internetGatewayAttachment.name }
        : undefined;

    var elasticIp = this._addResource(novaform.ec2.EIP(mkname('Eip'), {
        Domain: 'vpc',
    }, eipAttributes));

    var securityGroup = this._addResource(novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpcResource,
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
        CidrIp: vpcCidrBlock,
    }));

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: allowedSshCidr,
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeHttp'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0',
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeHttps'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0',
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgePostgres'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        CidrIp: vpcCidrBlock,
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeIcmp'), {
        GroupId: securityGroup,
        IpProtocol: 'icmp',
        FromPort: -1,
        ToPort: -1,
        CidrIp: '0.0.0.0/0',
    }));

    this._addResource(novaform.ec2.SecurityGroupEgress(mkname('SgeSsh'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: vpcCidrBlock,
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

    var shellscript = novaform.loadUserDataFromFile(__dirname + '/bastion-user-data.sh', {
        ASGName: name,
        LaunchConfigName: mkname('LaunchConfig'),
        EIPAllocId: novaform.getAtt(elasticIp.name, 'AllocationId')
    });
    var users = {
        users: _.flattenDeep(['default', users || []]),
    };

    var placeholder = '###PLACEHOLDER###';
    var userdata = multipart.generate([
        {
            content: placeholder,
            mime: 'text/x-shellscript',
            encoding: 'utf8',
            filename: 'bastion-user-data.sh',
        },
        {
            content: yaml.safeDump(users),
            mime: 'text/cloud-config',
            encoding: 'utf8',
            filename: 'users',
        },
    ], {
        from: 'nobody XX XXX XX XX:XX:XX XXXX XXXX',
        boundary: '3f4aec2c-5233-11e5-9d64-e745058d08ed',
    });
    var parts = userdata.split(placeholder);
    userdata = novaform.join('', [_.first(parts), shellscript, _.last(parts)]);

    var launchConfiguration = this._addResource(novaform.asg.LaunchConfiguration(mkname('LaunchConfig'), {
        KeyName: keyName,
        ImageId: imageId,
        SecurityGroups: [ securityGroup ],
        InstanceType: instanceType,
        AssociatePublicIpAddress: true,
        IamInstanceProfile: instanceProfile,
        UserData: novaform.base64(userdata),
    }, {
        DependsOn: role.name,
    }));

    var asg = this._addResource(novaform.asg.AutoScalingGroup(name, {
        AvailabilityZones: vpcPublicAvailabilityZones,
        LaunchConfigurationName: launchConfiguration,
        VPCZoneIdentifier: vpcPublicSubnets,
        MinSize: 1,
        MaxSize: 2, // one extra reserved for rolling update,
        DesiredCapacity: 1,
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
                PauseTime: 'PT15M',
                WaitOnResourceSignals: true
            }
        },
    }));

    this.securityGroup = securityGroup;
    this.elasticIp = elasticIp;
    this.asg = asg;
}

Bastion.prototype = Object.create(Template.prototype);

module.exports = Bastion;
