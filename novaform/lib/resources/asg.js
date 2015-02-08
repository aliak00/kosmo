var Resource = require('../resource');

function LaunchConfiguration(name, properties, metadata) {
    if (!(this instanceof LaunchConfiguration)) {
        return new LaunchConfiguration(name, properties, metadata);
    }

    Resource.call(this, 'AWS::AutoScaling::LaunchConfiguration', name, properties);

    this.metadata = metadata;
}
LaunchConfiguration.prototype = Object.create(Resource.prototype);

function AutoScalingGroup(name, properties) {
    if (!(this instanceof AutoScalingGroup)) {
        return new AutoScalingGroup(name, properties);
    }

    Resource.call(this, 'AWS::AutoScaling::AutoScalingGroup', name, properties);

    this.extendWith = {};
    if (this.properties.UpdatePolicy) {
        this.extendWith.UpdatePolicy = this.properties.UpdatePolicy;
    }
}
AutoScalingGroup.prototype = Object.create(Resource.prototype);

module.exports = {
    LaunchConfiguration: LaunchConfiguration,
    AutoScalingGroup: AutoScalingGroup
};