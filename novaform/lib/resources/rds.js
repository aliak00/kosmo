var Resource = require('../resource');

function DBSubnetGroup(name, properties) {
    if (!(this instanceof DBSubnetGroup)) {
        return new DBSubnetGroup(name, properties);
    }

    Resource.call(this, 'AWS::RDS::DBSubnetGroup', name, properties);
}
DBSubnetGroup.prototype = Object.create(Resource.prototype);

function DBInstance(name, properties) {
    if (!(this instanceof DBInstance)) {
        return new DBInstance(name, properties);
    }

    Resource.call(this, 'AWS::RDS::DBInstance', name, properties);
}
DBInstance.prototype = Object.create(Resource.prototype);

module.exports = {
    DBSubnetGroup: DBSubnetGroup,
    DBInstance: DBInstance
};