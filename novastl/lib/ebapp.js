var novaform = require('novaform')
    , _ = require('lodash');

/**
    Refs include:
**/
function EBApp(options) {
    if (!(this instanceof EBApp)) {
        return new EBApp(options);
    }

    novaform.Template.call(this);

    var name = options.name || 'EBApp';
    var sourceBundle = options.sourceBundle;
    var vpcId = options.vpcId;
    var publicSubnets = options.publicSubnets;
    var privateSubnets = options.privateSubnets;
    var bastionSecurityGroup = options.bastionSecurityGroup;
    var natSecurityGroup = options.natSecurityGroup;
    var keyName = options.keyName;
    var cnamePrefix = options.cnamePrefix;
    var optionSettings = options.optionSettings || [];

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var role = this._addResource(novaform.iam.Role(mkname('IAmRole'), {
        AssumeRolePolicyDocument: {
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
        PolicyName: role.name,
        Roles: [ role ],
        PolicyDocument: {
            Statement: [{
                Effect: 'Allow',
                NotAction: ['iam:*'],
                Resource: '*'
            }]
        }
    }));

    var instanceProfile = this._addResource(novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/ebapp/']),
        Roles: [ role ]
    }));

    var application = this._addResource(novaform.eb.Application(name, {
        ApplicationName: name,
        Description: name + ' beanstalk application'
    }));

    var applicationVersion = this._addResource(novaform.eb.ApplicationVersion(mkname('Version'), {
        ApplicationName: application,
        Description: name + ' beanstalk application version',
        SourceBundle: sourceBundle
    }));

    var securityGroup = this._addResource(novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpcId,
        GroupDescription: name + ' security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')])
        }
    }));

    var templateOptionSettings = [{
        Namespace: 'aws:autoscaling:launchconfiguration',
        OptionName: 'SecurityGroups',
        Value: securityGroup
    },{
        Namespace: 'aws:autoscaling:launchconfiguration',
        OptionName: 'SSHSourceRestriction',
        Value: novaform.join('', ['tcp,22,22,', bastionSecurityGroup])
    },{
        Namespace: 'aws:autoscaling:launchconfiguration',
        OptionName: 'EC2KeyName',
        Value: keyName
    },{
        Namespace: 'aws:autoscaling:launchconfiguration',
        OptionName: 'IamInstanceProfile',
        Value: instanceProfile
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'VPCId',
        Value: vpcId
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'Subnets',
        Value: novaform.join(',', privateSubnets)
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'ELBSubnets',
        Value: novaform.join(',', publicSubnets)
    }];

    templateOptionSettings = _.reduce(optionSettings, function(memo, optionSetting) {
        return memo.concat({
            Namespace: optionSetting.Namespace,
            OptionName: optionSetting.Name,
            Value: optionSetting.Value,
        });
    }, templateOptionSettings);

    var environment = this._addResource(novaform.eb.Environment(mkname('Environment'), {
        ApplicationName: application,
        Description: name + ' beanstalk environment',
        VersionLabel: applicationVersion,
        SolutionStackName: '64bit Amazon Linux 2014.09 v1.2.0 running Node.js',
        Tier: {
            Name: 'WebServer',
            Type: 'Standard',
            Version: '1.0'
        },
        OptionSettings: templateOptionSettings,
        CNAMEPrefix: cnamePrefix,
    }));

    this.environment = environment;
}
EBApp.prototype = Object.create(novaform.Template.prototype);

module.exports = EBApp;
