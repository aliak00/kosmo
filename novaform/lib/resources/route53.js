var Resource = require('../resource');

function HealthCheck(name, properties) {
    if (!(this instanceof HealthCheck)) {
        return new HealthCheck(name, properties);
    }

    Resource.call(this, 'AWS::Route53::HealthCheck', name, properties);
}
HealthCheck.prototype = Object.create(Resource.prototype);

function HostedZone(name, properties) {
    if (!(this instanceof HostedZone)) {
        return new HostedZone(name, properties);
    }

    Resource.call(this, 'AWS::Route53::HostedZone', name, properties);
}
HostedZone.prototype = Object.create(Resource.prototype);

function RecordSet(name, properties) {
    if (!(this instanceof RecordSet)) {
        return new RecordSet(name, properties);
    }

    Resource.call(this, 'AWS::Route53::RecordSet', name, properties);
}
RecordSet.prototype = Object.create(Resource.prototype);

function RecordSetGroup(name, properties) {
    if (!(this instanceof RecordSetGroup)) {
        return new RecordSetGroup(name, properties);
    }

    Resource.call(this, 'AWS::Route53::RecordSetGroup', name, properties);
}
RecordSetGroup.prototype = Object.create(Resource.prototype);

module.exports = {
    HealthCheck: HealthCheck,
    HostedZone: HostedZone,
    RecordSet: RecordSet,
    RecordSetGroup: RecordSetGroup
};
