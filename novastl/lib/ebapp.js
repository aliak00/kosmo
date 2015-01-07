var novaform = require('novaform')
    , Template = require('./template')
    , _ = require('underscore');

/**
    Refs include:
**/
function EBApp(options) {
    if (!(this instanceof EBApp)) {
        return new EBApp(options);
    }

    var name = options.name || 'EBApp';
    var sourceBundle = options.sourceBundle;
    var vpc = options.vpc;
    var bastionSecurityGroup = options.bastionSecurityGroup;
    var natSecurityGroup = options.natSecurityGroup;
    var keyName = options.keyName;
    var publicSubnets = options.publicSubnets;
    var privateSubnets = options.privateSubnets;

    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var refs = {};

    refs['role'] = novaform.iam.Role(mkname('IAmRole'), {
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
    });

    refs['policy'] = novaform.iam.Policy(mkname('IAmRolePolicy'), {
        PolicyName: refs['role'].name,
        Roles: [refs['role']],
        PolicyDocument: {
            Statement: [{
                Effect: 'Allow',
                NotAction: ['iam:*'],
                Resource: '*'
            }]
        }
    });

    refs['instance-profile'] = novaform.iam.InstanceProfile(mkname('IAmInstanceProfile'), {
        Path: novaform.join('', ['/', novaform.refs.StackName, '/ebapp/']),
        Roles: [refs['role']]
    });

    refs['application'] = novaform.eb.Application(name, {
        ApplicationName: name,
        Description: name + ' beanstalk application'
    });

    refs['version'] = novaform.eb.ApplicationVersion(mkname('Version'), {
        ApplicationName: refs['application'],
        Description: name + ' beanstalk application version',
        SourceBundle: sourceBundle
    });

    refs['sg'] = novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpc,
        GroupDescription: name + ' security group',
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Sg')])
        }
    });

    var templateOptionSettings = [{
        Namespace: 'aws:autoscaling:launchconfiguration',
        OptionName: 'SecurityGroups',
        Value: refs['sg']
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
        Value: refs['instance-profile']
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'VPCId',
        Value: vpc
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'Subnets',
        Value: novaform.join(',', privateSubnets)
    },{
        Namespace: 'aws:ec2:vpc',
        OptionName: 'ELBSubnets',
        Value: novaform.join(',', publicSubnets)
    }];

    refs['environment'] = novaform.eb.Environment(mkname('Environment'), {
        ApplicationName: refs['application'],
        Description: name + ' beanstalk environment',
        VersionLabel: refs['version'],
        SolutionStackName: '64bit Amazon Linux 2014.09 v1.0.9 running Node.js',
        Tier: {
            Name: 'WebServer',
            Type: 'Standard',
            Version: '1.0'
        },
        OptionSettings: templateOptionSettings
    });

    this.refs = refs;
}
EBApp.prototype = Object.create(Template.prototype);

module.exports = EBApp;
