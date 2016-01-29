var AWSResource = require('../awsresource')
    , types = require('../types');

var CodeType = types.object('lambda-code', {
    S3Bucket: types.string,
    S3Key: types.string,
    S3ObjectVersion: types.string,
    ZipFile: types.string,
});

var Function = AWSResource.define('AWS::Lambda::Function', {
    Code: { type: CodeType, required: true },
    Description: { type: types.string },
    Handler: { type: types.string, required: true },
    MemorySize: { type: types.number },
    Role: { type: types.string },
    Runtime: { type: types.enum('nodejs'), required: true },
    Timeout: { type: types.number },
});

module.exports = {
    Function: Function,
};
