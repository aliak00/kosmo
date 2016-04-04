var AWSResource = require('../aws-resource')
    , types = require('../types');

var RolePolicyType = types.object('iam-role-policy', {
    PolicyDocument: types.jsonobject, // required
    PolicyName: types.string, // required
});

var Role = AWSResource.define('AWS::IAM::Role', {
    AssumeRolePolicyDocument : { type: types.jsonobject, required: true },
    ManagedPolicyArns: { type: types.array(types.string) },
    Path : { type: types.string },
    Policies : { type: types.array(RolePolicyType) },
});

var Policy = AWSResource.define('AWS::IAM::Policy', {
    Groups : { type: types.array(types.string), required: 'conditional' },
    PolicyDocument : { type: types.jsonobject, required: true },
    PolicyName : { type: types.string, required: true },
    Roles : { type: types.array(types.string) },
    Users : { type: types.array(types.string), required: 'conditional' },
});

function PathValidator(self) {
    // TODO: Half assed solution. Path can be a fn.Join for eg.
    if (typeof self.properties.Path === 'string'
        && self.properties.Path !== '/'
        && !/^\/[a-zA-Z0-9+=,.@_\-\/]*\/$/.test(self.properties.Path)) {
        return 'Path can contain only alphanumeric characters and / and begin and end with /';
    }
}

var InstanceProfile = AWSResource.define('AWS::IAM::InstanceProfile', {
    Path : { type: types.string, required: true, validators: [PathValidator] },
    Roles : { type: types.array(types.ref('AWS::IAM::Role')), required: true },
});

module.exports = {
    Role: Role,
    Policy: Policy,
    InstanceProfile: InstanceProfile,
};
