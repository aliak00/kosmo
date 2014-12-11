var Resource = require('./../resource');

function Role(name, options) {
    if (!(this instanceof Role)) {
        return new Role(name, options);
    }

    this.properties = options;
    this.type = 'AWS::IAM::Role';
    this.name = name;

    // TODO: Support this use case
    if (options.Policies) {
        throw new Error('AWS::IAM::Role.Policies not supported right now.');
    }
}
Role.prototype = Object.create(Resource.prototype);

function Policy(name, options) {
    if (!(this instanceof Policy)) {
        return new Policy(name, options);
    }

    this.properties = options;
    this.type = 'AWS::IAM::Policy';
    this.name = name;
}
Policy.prototype = Object.create(Resource.prototype);

function InstanceProfile(name, options) {
    if (!(this instanceof InstanceProfile)) {
        return new InstanceProfile(name, options);
    }

    this.properties = options;
    this.type = 'AWS::IAM::InstanceProfile';
    this.name = name;
}
InstanceProfile.prototype = Object.create(Resource.prototype);

module.exports = {
    Role: Role,
    Policy: Policy,
    InstanceProfile: InstanceProfile
};