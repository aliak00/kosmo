var AWSResource = require('../awsresource')
    , types = require('../types');

var CorsConfigurationRule = types.object('s3-cors-configuration', {
    AllowedHeaders: types.array,
    AllowedMethods: types.array, // required
    AllowedOrigins: types.array, // required
    ExposedHeaders: types.array,
    Id: types.string,
    MaxAge: types.number,
});

var CorsConfigurationType = types.object('s3-cors-configuration', {
    CorsRules: types.array, // TODO: array of CorsRules
});

var LifecycleConfigurationType = types.object('s3-lifecycle-configuration', {
    Rules: types.array, // TODO: array of LifecycleRules
});

var LoggingConfigurationType = types.object('s3-logging-configuration', {
    DestinationBucketName: types.string,
    LogFilePrefix: types.string,
});

var NotificationConfigurationTopicConfigurationType = types.object('s3-notification-configuration-topic-configuration', {
    Event: types.string, // required
    Topic: types.string, // required
});

var NotificationConfigurationType = types.object('s3-notification-configuration', {
    TopicConfigurations: types.array, // array of NotificationTopicConfiguration // required
});

var VersioningConfigurationType = types.object('s3-versioning-configuration', {
    Status: types.enum('Enabled', 'Suspended'), // required
});

var WebsiteConfigurationRedirectAllRequestsTo = types.object('s3-website-configuration-redirect-all-requests-to', {
    // TODO:
});

var WebsiteConfigurationRoutingRules = types.object('s3-website-configuration-routing-rules', {
    // TODO:
});

var WebsiteConfigurationType = types.object('s3-website-configuration', {
    ErrorDocument: types.string,
    IndexDocument: types.string,
    RedirectAllRequestsTo: WebsiteConfigurationRedirectAllRequestsTo,
    RoutingRules: WebsiteConfigurationRoutingRules,
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
