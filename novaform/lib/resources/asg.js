var Resource = require('./../resource');

function LaunchConfiguration(name, properties, metadata) {
    if (!(this instanceof LaunchConfiguration)) {
        return new LaunchConfiguration(name, properties, metadata);
    }

    this.properties = properties;
    this.metadata = metadata;
    this.type = 'AWS::AutoScaling::LaunchConfiguration';
    this.name = name;

}
LaunchConfiguration.prototype = Object.create(Resource.prototype);

function AutoScalingGroup(name, properties) {
    if (!(this instanceof AutoScalingGroup)) {
        return new AutoScalingGroup(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::AutoScaling::AutoScalingGroup';
    this.name = name;

}
AutoScalingGroup.prototype = Object.create(Resource.prototype);

module.exports = {
    LaunchConfiguration: LaunchConfiguration,
    AutoScalingGroup: AutoScalingGroup
};