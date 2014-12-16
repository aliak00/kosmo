var Resource = require('./../resource');

function HealthCheck(name, properties) {
    if (!(this instanceof HealthCheck)) {
        return new HealthCheck(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::Route53::HealthCheck';
    this.name = name;

}
HealthCheck.prototype = Object.create(Resource.prototype);

function HostedZone(name, properties) {
    if (!(this instanceof HostedZone)) {
        return new HostedZone(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::Route53::HostedZone';
    this.name = name;

}
HostedZone.prototype = Object.create(Resource.prototype);

function RecordSet(name, properties) {
    if (!(this instanceof RecordSet)) {
        return new RecordSet(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::Route53::RecordSet';
    this.name = name;

}
RecordSet.prototype = Object.create(Resource.prototype);

function RecordSetGroup(name, properties) {
    if (!(this instanceof RecordSetGroup)) {
        return new RecordSetGroup(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::Route53::RecordSetGroup';
    this.name = name;

}
RecordSetGroup.prototype = Object.create(Resource.prototype);

module.exports = {
    HealthCheck: HealthCheck,
    HostedZone: HostedZone,
    RecordSet: RecordSet,
    RecordSetGroup: RecordSetGroup
};