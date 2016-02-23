var Template = require('../template')
    , novaform = require('../../../novaform')
    , util = require('util');

function Rds(options) {
    if (!(this instanceof Rds)) {
        return new Rds(options);
    }

    Template.call(this);

    var vpcId = options.vpcId;
    var subnets = options.subnets;
    var allowedCidr = options.allowedCidr;
    var name = options.name || 'mydb';
    var engine = options.engine || 'postgres';
    var engineVersion = options.engineVersion || '9.3.5';
    var allocatedStorage = options.allocatedStorage || 5;
    var multiAz = typeof options.multiAz === 'boolean' ? options.multiAz : true;
    var instanceType = options.instanceType || 'db.t1.micro';
    var username = options.username || 'root';
    var password = options.password;
    var storageType = options.storageType || 'standard';
    var iops = options.iops;
    var backupRetentionPeriod = options.backupRetentionPeriod;
    var preferredBackupWindow = options.preferredBackupWindow;
    var preferredMaintenanceWindow = options.preferredMaintenanceWindow;
    var deletionPolicy = options.deletionPolicy || 'Delete';
    var publiclyAccessible = options.publiclyAccessible || false;
    var snapshotIdentifier = options.snapshotIdentifier;

    var dbname = options.name;

    if (dbname && (dbname.toLowerCase() === 'db' || dbname.toLowerCase() === 'database')) {
        throw new Error(util.format('"%s" name is reserved', name));
    }

    if (typeof password !== 'string' && !(password instanceof novaform.fn.ref)) {
        throw new Error('password must be either string or novaform.fn.ref');
    }

    if (typeof password === 'string' && password.length < 8) {
        throw new Error('RDS password has to be at least 8 characters');
    }

    function mkname(str) {
        var camelCaseName = name.charAt(0).toUpperCase() + name.slice(1);
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
        CidrIp: allowedCidr,
    }));

    var subnetGroup = this._addResource(novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: name + ' db private subnets',
        SubnetIds: subnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.fn.join('-', [novaform.refs.StackName, mkname('PrivateSubnet')]),
        },
    }));

    var dbinstance = this._addResource(novaform.rds.DBInstance(mkname('Instance'), {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceType,
        DBName: dbname,
        DBSubnetGroupName: subnetGroup,
        Engine: engine,
        EngineVersion: engineVersion,
        Iops: iops,
        StorageType: storageType,
        MasterUsername: username,
        MasterUserPassword: password,
        BackupRetentionPeriod: backupRetentionPeriod,
        PreferredBackupWindow: preferredBackupWindow,
        PreferredMaintenanceWindow: preferredMaintenanceWindow,
        PubliclyAccessible: publiclyAccessible,
        DBSnapshotIdentifier: snapshotIdentifier,
        VPCSecurityGroups: [securityGroup],
        MultiAZ: multiAz,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.fn.join('-', [novaform.refs.StackName, mkname('Instance')]),
        },
    }, {
        DeletionPolicy: deletionPolicy,
    }));

    this.subnetGroup = subnetGroup;
    this.dbinstance = dbinstance;
}
Rds.prototype = Object.create(Template.prototype);

module.exports = Rds;
