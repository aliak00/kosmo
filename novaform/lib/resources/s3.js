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

var CorsConfiguration = types.object('s3-cors-configuration', {
    CorsRules: types.array, // TODO: array of CorsRules
});

var LifecycleConfiguration = types.object('s3-lifecycle-configuration', {
    Rules: types.array, // TODO: array of LifecycleRules
});

var LoggingConfiguration = types.object('s3-logging-configuration', {
    DestinationBucketName: types.string,
    LogFilePrefix: types.string,
});

var NotificationTopicConfiguration = types.object('s3-notification-topic-configuration', {
    // TODO:
});

var NotificationConfiguration = types.object('s3-notification-configuration', {
    TopicConfigurations: types.array, // TODO: array of NotificationTopicConfiguration // required
});

var VersioningConfiguration = types.object('s3-versioning-configuration', {
    Status: types.string, // required
});

var WebsiteConfigurationRedirectAllRequestsTo = types.object('s3-website-configuration-redirect-all-requests-to', {
    // TODO:
});

var WebsiteConfigurationRoutingRules = types.object('s3-website-configuration-routing-rules', {
    // TODO:
});

var WebsiteConfiguration = types.object('s3-website-configuration', {
    ErrorDocument: types.string,
    IndexDocument: types.string,
    RedirectAllRequestsTo: WebsiteConfigurationRedirectAllRequestsTo,
    RoutingRules: WebsiteConfigurationRoutingRules,
});

var Bucket = AWSResource.define('AWS::S3::Bucket', {
    AccessControl : { type: types.enum('Private', 'PublicRead', 'PublicReadWrite', 'AuthenticatedRead',
                                       'LogDeliveryWrite', 'BucketOwnerRead', 'BucketOwnerFullControl') },
    BucketName : { type: types.string },
    CorsConfiguration : { type: CorsConfiguration },
    LifecycleConfiguration : { type: LifecycleConfiguration },
    LoggingConfiguration : { type: LoggingConfiguration },
    NotificationConfiguration : { type: NotificationConfiguration },
    Tags : { type: types.tags },
    VersioningConfiguration : { type: VersioningConfiguration },
    WebsiteConfiguration : { type: WebsiteConfiguration },
});

var BucketPolicy = AWSResource.define('AWS::S3::BucketPolicy', {
    Bucket : { type: types.string, require: true },
    PolicyDocument : { type: types.object('s3-bucket-policy-document'), require: true },
});

module.exports = {
    Bucket: Bucket,
    BucketPolicy: BucketPolicy,
};
