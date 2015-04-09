var novaform = require('novaform')
    , _ = require('underscore')
    , util = require('util');

/**
    Refs include:
    - subnet-group: rds.DBSubnetGroup
    - instance: rds.DBInstance
**/
function Rds(options) {
    if (!(this instanceof Rds)) {
        return new Rds(options);
    }

    novaform.Template.call(this);

    var vpcId = options.vpcId;
    var subnets = options.subnets;
    var allowedCidr = options.allowedCidr;
    var name = options.name || 'mydb';
    var allocatedStorage = options.allocatedStorage || 5;
    var multiAz = typeof options.multiAz === 'boolean' ? options.multiAz : true;
    var availabilityZone = options.availabilityZone = 'None';
    var instanceType = options.instanceType || 'db.t1.micro';
    var username = options.username || 'root';
    var password = options.password;
    var backupRetentionPeriod = options.backupRetentionPeriod;

    if (name.toLowerCase() === 'db' || name.toLowerCase() === 'database') {
        throw new Error(util.format('"%s" name is reserved', name));
    }

    if (typeof password !== 'string' && !(password instanceof novaform.ref)) {
        throw new Error('password must be either string or novaform.ref');
    }

    if (typeof password === 'string' && password.length < 8) {
        throw new Error('RDS password has to be at least 8 characters');
    }

    function mkname(str) {
        var camelCaseName = name.charAt(0).toUpperCase() + name.slice(1)
        return camelCaseName + str;
    }

    var securityGroup = this._addResource(novaform.ec2.SecurityGroup(mkname('Sg'), {
        VpcId: vpcId,
        GroupDescription: 'RDS from private subnets',
    }));

    this._addResource(novaform.ec2.SecurityGroupIngress(mkname('SgiPostgres'), {
        GroupId: securityGroup,
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        CidrIp: allowedCidr
    }));

    var subnetGroup = this._addResource(novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: name + ' db private subnets',
        SubnetIds: subnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('PrivateSubnet')])
        }
    }));

    var dbinstance = this._addResource(novaform.rds.DBInstance(mkname('Instance'), {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceType,
        DBName: name,
        DBSubnetGroupName: subnetGroup,
        Engine: 'postgres',
        EngineVersion: '9.3.5',
        MasterUsername: username,
        MasterUserPassword: password,
        BackupRetentionPeriod: backupRetentionPeriod,
        PubliclyAccessible: false,
        VPCSecurityGroups: [securityGroup],
        MultiAZ: multiAz,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Instance')])
        }
    })); // TODO "DeletionPolicy" : "Snapshot"

    this.subnetGroup = subnetGroup;
    this.dbinstance = dbinstance;
}
Rds.prototype = Object.create(novaform.Template.prototype);

module.exports = Rds;
