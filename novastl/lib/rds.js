var novaform = require('novaform')
    , Template = require('./template');

/**
    Template with rds.DBInstance as the resource object
**/
function Rds(options) {
    if (!(this instanceof Rds)) {
        return new Rds(options);
    }

    var vpcTemplate = options.vpcTemplate;
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

    var rg = novaform.ResourceGroup();

    var dbSubnetGroup = novaform.rds.DBSubnetGroup(mkname('PrivateSubnet'), {
        DBSubnetGroupDescription: 'db private subnets',
        SubnetIds: vpcTemplate.privateSubnets,
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

    rg.add(dbSubnetGroup);
    rg.add(dbInstance);

    this.resource = dbInstance;
    this.resourceGroup = rg;
}
Rds.prototype = Object.create(Template.prototype);

module.exports = Rds;
