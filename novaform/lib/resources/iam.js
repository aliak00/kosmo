var AWSResource = require('../awsresource')
    , types = require('../types');

var Role = AWSResource.define('AWS::IAM::Role', {
    AssumeRolePolicyDocument : { type: types.object('iam-assume-role-policy-document'), required: true },
    Path : { type: types.string, required: true },
    Policies : { type: types.array },
});

var Policy = AWSResource.define('AWS::IAM::Policy', {
    Groups : { type: types.array, required: 'conditional' },
    PolicyDocument : { type: types.object('iam-policy-document'), required: true },
    PolicyName : { type: types.string, required: true },
    Roles : { type: types.array },
    Users : { type: types.array, required: 'conditional' },
});

function PathValidator(self) {
    // TODO: Half assed solution. Path can be a fn.Join for eg.
    if (typeof self.properties.Path === 'string' && !/^\/[a-zA-Z0-9+=,.@_\-\/]*\/$/.test(self.properties.Path)) {
        return 'Path can contain only alphanumeric characters and / and begin and end with /';
    };
}

var InstanceProfile = AWSResource.define('AWS::IAM::InstanceProfile', {
    Path : { type: types.string, required: true, validators: [PathValidator] },
    Roles : { type: types.array, required: true },
});

module.exports = {
    Role: Role,
    Policy: Policy,
    InstanceProfile: InstanceProfile
};
