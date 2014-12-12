var Resource = require('./../resource');

function DBSubnetGroup(name, properties) {
    if (!(this instanceof DBSubnetGroup)) {
        return new DBSubnetGroup(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::RDS::DBSubnetGroup';
    this.name = name;

}
DBSubnetGroup.prototype = Object.create(Resource.prototype);

function DBInstance(name, properties) {
    if (!(this instanceof DBInstance)) {
        return new DBInstance(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::RDS::DBInstance';
    this.name = name;

}
DBInstance.prototype = Object.create(Resource.prototype);

module.exports = {
    DBSubnetGroup: DBSubnetGroup,
    DBInstance: DBInstance
};