var novaform = require('novaform');

function Rds(options) {
    var vpc = options.vpc;
    var name = options.name;
    var allocatedStorage = options.allocatedStorage || 5;
    var multiAz = typeof options.multiAz === 'boolean' ? options.multiAz : true;
    var availabilityZone = options.availabilityZone = 'None';
    var instanceClass = options.instanceClass || 'db.t1.micro';
    var username = options.username || 'root';
    var password = options.password || 'admin';

    var cft = novaform.Template();

    var dbSubnetGroup = novaform.rds.DBSubnetGroup('DBPrivateSubnet', {
        DBSubnetGroupDescription: 'private subnets',
        SubnetIds: vpc.privateSubnets,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', novaform.refs.StackName, 'DBPrivateSubnet')
        }
    });

    var dbInstance = novaform.rds.DBInstance('DBInstance', {
        AllocatedStorage: allocatedStorage,
        DBInstanceClass: instanceClass,
        DBName: name,
        DBSubnetGroupName: dbSubnetGroup,
        Engine: 'postgres',
        EngineVersion: '9.3.3',
        MasterUsername: username,
        MasterPassword: password,
        Tags: {
            Application: novaform.refs.StackId,
            Name: novaform.join('-', [novaform.refs.StackName, 'DBInstance'])
        }
    });

    cft.addResource(dbSubnetGroup);
    cft.addResource(dbInstance);

    dbInstance.template = cft;
    return dbInstance;
}

module.exports = Rds;
