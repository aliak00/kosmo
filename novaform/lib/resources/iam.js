var Resource = require('../resource');

function Role(name, properties) {
    if (!(this instanceof Role)) {
        return new Role(name, properties);
    }

    Resource.call(this, 'AWS::IAM::Role', name, properties);

    // TODO: Support this use case
    if (properties.Policies) {
        throw new Error('AWS::IAM::Role.Policies not supported right now.');
    }
}
Role.prototype = Object.create(Resource.prototype);

function Policy(name, properties) {
    if (!(this instanceof Policy)) {
        return new Policy(name, properties);
    }

    Resource.call(this, 'AWS::IAM::Policy', name, properties);
}
Policy.prototype = Object.create(Resource.prototype);

function InstanceProfile(name, properties) {
    if (!(this instanceof InstanceProfile)) {
        return new InstanceProfile(name, properties);
    }

    Resource.call(this, 'AWS::IAM::InstanceProfile', name, properties);
}
InstanceProfile.prototype = Object.create(Resource.prototype);

module.exports = {
    Role: Role,
    Policy: Policy,
    InstanceProfile: InstanceProfile
};
