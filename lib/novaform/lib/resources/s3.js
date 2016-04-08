var AWSResource = require('../aws-resource')
    , types = require('../types');

var CorsRuleType = types.object('CorsRule', {
    AllowedHeaders: { type: types.array(types.string) },
    AllowedMethods: { type: types.array(types.string), required: true },
    AllowedOrigins: { type: types.array(types.string), required: true },
    ExposedHeaders: { type: types.array(types.string) },
    Id: { type: types.string },
    MaxAge: { type: types.number },
});

var CorsConfigurationType = types.object('CorsConfiguration', {
    CorsRules: { type: types.array(CorsRuleType) },
});

var LifecycleRuleType = types.object('Rule', {
    // TODO:
});

var LifecycleConfigurationType = types.object('s3-lifecycle-configuration', {
    Rules: { type: types.array(LifecycleRuleType) },
});

var LoggingConfigurationType = types.object('LoggingConfiguration', {
    DestinationBucketName: { type: types.string },
    LogFilePrefix: { type: types.string },
});

var S3KeyRuleType = types.object('Rule', {
    Name: { type: types.enum('prefix', 'suffix'), required: true },
    Value: { type: types.string, required: true },
});

var S3KeyType = types.object('S3Key', {
    Rules: { type: types.array(S3KeyRuleType), required: true },
});

var FilterType = types.object('Filter', {
    S3Key: { type: S3KeyType, required: true },
});

var LambdaConfigurationType = types.object('LambdaConfiguration', {
    Event: { type: types.string, required: true },
    Function: { type: types.string, required: true },
    Filter: { type: FilterType },
});

var QueueConfigurationType = types.object('QueueConfiguration', {
    Event: { type: types.string, required: true },
    Queue: { type: types.string, required: true },
    Filter: { type: FilterType },
});

var TopicConfigurationType = types.object('TopicConfiguration', {
    Event: { type: types.string, required: true },
    Topic: { type: types.string, required: true },
    Filter: { type: FilterType },
});

var NotificationConfigurationType = types.object('s3-notification-configuration', {
    TopicConfigurations: { type: types.array(TopicConfigurationType) },
    QueueConfigurations: { type: types.array(QueueConfigurationType) },
    LamdaConfigurations: { type: types.array(LambdaConfigurationType) },
});

var VersioningConfigurationType = types.object('VersioningConfiguration', {
    Status: { type: types.enum('Enabled', 'Suspended'), required: true },
});

var RedirectAllRequestsToType = types.object('RedirectAllRequestsTo', {
    // TODO:
});

var RoutingRuleType = types.object('RoutingRule', {
    // TODO:
});

var WebsiteConfigurationType = types.object('s3-website-configuration', {
    ErrorDocument: { type: types.string },
    IndexDocument: { type: types.string },
    RedirectAllRequestsTo: { type: RedirectAllRequestsToType },
    RoutingRules: { type: RoutingRuleType },
});

var Bucket = AWSResource.define('AWS::S3::Bucket', {
    AccessControl : { type: types.enum('Private', 'PublicRead', 'PublicReadWrite', 'AuthenticatedRead',
                                       'LogDeliveryWrite', 'BucketOwnerRead', 'BucketOwnerFullControl') },
    BucketName : { type: types.string },
    CorsConfiguration : { type: CorsConfigurationType },
    LifecycleConfiguration : { type: LifecycleConfigurationType },
    LoggingConfiguration : { type: LoggingConfigurationType },
    NotificationConfiguration : { type: NotificationConfigurationType },
    Tags : { type: types.tags },
    VersioningConfiguration : { type: VersioningConfigurationType },
    WebsiteConfiguration : { type: WebsiteConfigurationType },
});

var BucketPolicy = AWSResource.define('AWS::S3::BucketPolicy', {
    Bucket : { type: types.string, required: true },
    PolicyDocument : { type: types.object('s3-bucket-policy-document'), required: true },
});

module.exports = {
    Bucket: Bucket,
    BucketPolicy: BucketPolicy,
};
