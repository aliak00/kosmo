var AWSResource = require('../aws-resource')
    , types = require('../types');

var CodeType = types.object('Code', {
    S3Bucket: { type: types.string },
    S3Key: { type: types.string },
    S3ObjectVersion: { type: types.string },
    ZipFile: { type: types.string },
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

var LambdaPermissionActionTypes = types.enum(
    'lambda:AddPermission',
    'lambda:CreateAlias',
    'lambda:CreateEventSourceMapping',
    'lambda:CreateFunction',
    'lambda:DeleteAlias',
    'lambda:DeleteEventSourceMapping',
    'lambda:DeleteFunction',
    'lambda:GetAlias',
    'lambda:GetEventSourceMapping',
    'lambda:GetFunction',
    'lambda:GetFunctionConfiguration',
    'lambda:GetPolicy',
    'lambda:Invoke',
    'lambda:InvokeAsync',
    'lambda:ListAliases',
    'lambda:ListEventSourceMappings',
    'lambda:ListFunctions',
    'lambda:ListVersionsByFunction',
    'lambda:PublishVersion',
    'lambda:RemovePermission',
    'lambda:UpdateAlias',
    'lambda:UpdateEventSourceMapping',
    'lambda:UpdateFunctionCode',
    'lambda:UpdateFunctionConfiguration',
    'lambda:*');

var Permission = AWSResource.define('AWS::Lambda::Permission', {
    Action: { type: LambdaPermissionActionTypes, required: true },
    FunctionName: { type: types.string, required: true },
    Principal: { type: types.string, required: true },
    SourceAccount: { type: types.string },
    SourceArn: { type: types.string },
});

module.exports = {
    Function: Function,
    Permission,
};
