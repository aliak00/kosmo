var novaform = require('novaform')
    , ResourceGroup = require('./resource-group');

/**
    ResourceGroup with rds.DBInstance as the resource object
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

    var cft = novaform.Template();

    var dbSubnetGroup = novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: 'db private subnets',
        SubnetIds: vpc.privateSubnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('PrivateSubnet')])
        }
    });

    var dbInstance = novaform.rds.DBInstance(mkname('Instance'), {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceClass,
        DBName: originalName,
        DBSubnetGroupName: dbSubnetGroup,
        Engine: 'postgres',
        EngineVersion: '9.3.3',
        MasterUsername: username,
        MasterPassword: password,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, mkname('Instance')])
        }
    });

    cft.addResource(dbSubnetGroup);
    cft.addResource(dbInstance);

    this.template = cft;
    this.resource = dbInstance;
}
Rds.prototype = Object.create(ResourceGroup.prototype);

module.exports = Rds;
