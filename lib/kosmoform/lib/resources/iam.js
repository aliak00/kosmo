var AWSResource = require('../aws-resource')
    , types = require('../types');

var PolicyType = types.object('Policy', {
    PolicyDocument: { type: types.jsonobject, required: true },
    PolicyName: { type: types.string, require: true },
});

var Role = AWSResource.define('AWS::IAM::Role', {
    AssumeRolePolicyDocument : { type: types.jsonobject, required: true },
    ManagedPolicyArns: { type: types.array(types.string) },
    Path : { type: types.string },
    Policies : { type: types.array(PolicyType) },
});

var Policy = AWSResource.define('AWS::IAM::Policy', {
    Groups : { type: types.array(types.string), required: 'conditional' },
    PolicyDocument : { type: types.jsonobject, required: true },
    PolicyName : { type: types.string, required: true },
    Roles : { type: types.array(types.string) },
    Users : { type: types.array(types.string), required: 'conditional' },
});

function PathValidator(path) {
    // TODO: Half assed solution. Path can be a fn.Join for eg.
    if (typeof path === 'string'
        && path !== '/'
        && !/^\/[a-zA-Z0-9+=,.@_\-\/]*\/$/.test(path)) {
        return 'Path can contain only alphanumeric characters and / and begin and end with /';
    }
}

var InstanceProfile = AWSResource.define('AWS::IAM::InstanceProfile', {
    Path : { type: types.string, required: true, validator: PathValidator },
    Roles : { type: types.array(types.ref('AWS::IAM::Role')), required: true },
});

module.exports = {
    Role: Role,
    Policy: Policy,
    InstanceProfile: InstanceProfile,
};
