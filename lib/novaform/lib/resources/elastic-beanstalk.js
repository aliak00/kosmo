var AWSResource = require('../aws-resource')
    , types = require('../types');

var Application = AWSResource.define('AWS::ElasticBeanstalk::Application', {
    ApplicationName: { type: types.string },
    Description: { type: types.string },
});

var SourceBundleType = types.object('SourceBundle', {
    S3Bucket: { type: types.string, required: true },
    S3Key: { type: types.string, required: true },
});

var ApplicationVersion = AWSResource.define('AWS::ElasticBeanstalk::ApplicationVersion', {
    ApplicationName: { type: types.string, required: true },
    Description: { type: types.string },
    SourceBundle: { type: SourceBundleType },
});

var SourceConfigurationType = types.object('SourceConfiguration', {
    ApplicationName: { type: types.string, required: true },
    TemplateName: { type: types.string, required: true },
});

var OptionSettingsType = types.object('OptionSettings', {
    Name: { type: types.string, required: true },
    OptionName: { type: types.string, required: true },
    Value: { type: types.string, required: true },
});

var ConfigurationTemplate = AWSResource.define('AWS::ElasticBeanstalk::ConfigurationTemplate', {
    ApplicationName: { type: types.string, required: true },
    Description: { type: types.string },
    EnvironmentId: { type: types.string, required: 'conditional' },
    OptionSettings: { type: types.array(OptionSettingsType) },
    SolutionStackName: { type: types.string, required: 'conditional' },
    SourceConfiguration: { type: SourceConfigurationType, required: 'conditional' },
}, {
    validator: function(props) {
        if (!props.EnvironmentId && !props.SolutionStackName && !props.SourceConfiguration) {
            return 'Must specify either EnvironmentId, SolutionStackName, or SourceConfiguration';
        }
    },
});

var TierType = types.object('Tier', {
    Name: { type: types.string },
    Type: { type: types.enum('Standard', 'SQS/HTTP') },
    Version: { type: types.string },
});

var Environment = AWSResource.define('AWS::ElasticBeanstalk::Environment', {
    ApplicationName: { type: types.string, required: true },
    CNAMEPrefix: { type: types.string },
    Description: { type: types.string },
    EnvironmentName: { type: types.string },
    OptionSettings: { type: types.array(OptionSettingsType) },
    SolutionStackName: { type: types.string },
    TemplateName: { type: types.string },
    Tier: { type: TierType },
    VersionLabel: {type: types.string },
}, {
    validator: function(props) {
        if (props.EnvironmentName) {
            console.log('Warning: specifying EnvironmentName (' + props.EnvironmentName + ') will disallow updates that require replacement.');
        }
    },
});

module.exports = {
    Application: Application,
    ApplicationVersion: ApplicationVersion,
    ConfigurationTemplate: ConfigurationTemplate,
    Environment: Environment,
};
