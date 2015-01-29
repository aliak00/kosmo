var novaform = require('novaform')
    , Template = require('./template')
    , _ = require('underscore');

/**
    Refs include:
    - subnet-group: rds.DBSubnetGroup
    - instance: rds.DBInstance
**/
function Rds(options) {
    if (!(this instanceof Rds)) {
        return new Rds(options);
    }

    Template.call(this);

    var subnets = options.subnets;
    var name = options.name || 'mydb';
    var allocatedStorage = options.allocatedStorage || 5;
    var multiAz = typeof options.multiAz === 'boolean' ? options.multiAz : true;
    var availabilityZone = options.availabilityZone = 'None';
    var instanceClass = options.instanceClass || 'db.t1.micro';
    var username = options.username || 'root';
    var password = options.password;

    if (typeof password !== 'string') {
        throw new Error('RDS password was not specified');
    }
    if (password.length < 8) {
        throw new Error('RDS password has to be at least 8 characters');
    }

    var originalName = name;
    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var subnetGroup = this._addResource(novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: originalName + ' db private subnets',
        SubnetIds: subnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('PrivateSubnet')])
        }
    }));

    var dbinstance = this._addResource(novaform.rds.DBInstance(mkname('Instance'), {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceClass,
        DBName: originalName,
        DBSubnetGroupName: subnetGroup,
        Engine: 'postgres',
        EngineVersion: '9.3.3',
        MasterUsername: username,
        MasterUserPassword: password,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Instance')])
        }
    }));

    this.subnetGroup = subnetGroup;
    this.dbinstance = dbinstance;
}
Rds.prototype = Object.create(Template.prototype);

module.exports = Rds;
