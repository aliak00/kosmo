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

    var vpc = options.vpc;
    var name = options.name || 'mydb';
    var allocatedStorage = options.allocatedStorage || 5;
    var multiAz = typeof options.multiAz === 'boolean' ? options.multiAz : true;
    var availabilityZone = options.availabilityZone = 'None';
    var instanceClass = options.instanceClass || 'db.t1.micro';
    var username = options.username || 'root';
    var password = options.password || 'admin';

    var originalName = name;
    name = name.charAt(0).toUpperCase() + name.slice(1);

    function mkname(str) {
        return name + str;
    }

    var refs = {};

    var privateSubnets = _.map(vpc.refs.private, function(az) {
        return az.subnet;
    });

    refs['subnet-group'] = novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: originalName + ' db private subnets',
        SubnetIds: privateSubnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('PrivateSubnet')])
        }
    });

    refs['instance'] = novaform.rds.DBInstance(mkname('Instance'), {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceClass,
        DBName: originalName,
        DBSubnetGroupName: refs['subnet-group'],
        Engine: 'postgres',
        EngineVersion: '9.3.3',
        MasterUsername: username,
        MasterPassword: password,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Instance')])
        }
    });

    this.refs = refs;
}
Rds.prototype = Object.create(Template.prototype);

module.exports = Rds;
