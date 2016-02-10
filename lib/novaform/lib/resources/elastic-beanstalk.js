var AWSResource = require('../awsresource')
    , types = require('../types');

var Application = AWSResource.define('AWS::ElasticBeanstalk::Application', {
    ApplicationName: { type: types.string },
    Description: { type: types.string },
});

var ApplicationVersionSourceBundleType = types.object('elasticbeanstalk-applicationversion-sourcebundle', {
    S3Bucket: types.string, // required
    S3Key: types.string, // required
});

var ApplicationVersion = AWSResource.define('AWS::ElasticBeanstalk::ApplicationVersion', {
    ApplicationName: { type: types.string, required: true },
    Description: { type: types.string },
    SourceBundle: { type: ApplicationVersionSourceBundleType },
});

var ConfigurationTemplateSourceConfigurationType = types.object('elasticbeanstalk-configurationtemplate-sourceconfiguration', {
    ApplicationName: types.string, // required
    TemplateName: types.string, // required
});

var ConfigurationTemplateOptionSettingsType = types.object('elasticbeanstalk-configurationtemplate-optionsettings', { // eslint-disable-line no-unused-vars
    Name: types.string, // required
    OptionName: types.string, // required
    Value: types.string, // required
});

var ConfigurationTemplate = AWSResource.define('AWS::ElasticBeanstalk::ConfigurationTemplate', {
    ApplicationName: { type: types.string, required: true },
    Description: { type: types.string },
    EnvironmentId: { type: types.string, required: 'conditional' },
    OptionSettings: { type: types.array }, // array of ConfigurationTemplateOptionSettingsType
    SolutionStackName: { type: types.string, required: 'conditional' },
    SourceConfiguration: { type: ConfigurationTemplateSourceConfigurationType, required: 'conditional' },
}, {
    validator: function(props) {
        if (!props.EnvironmentId && !props.SolutionStackName && !props.SourceConfiguration) {
            return 'Must specify either EnvironmentId, SolutionStackName, or SourceConfiguration';
        }
    },
});

var EnvironmentTierType = types.object('elasticbeanstalk-environment-tier', {
    Name: types.string,
    Type: types.string, // 'Standard' or 'SQS/HTTP'
    Version: types.string,
});

var Environment = AWSResource.define('AWS::ElasticBeanstalk::Environment', {
    ApplicationName: { type: types.string, required: true },
    CNAMEPrefix: { type: types.string },
    Description: { type: types.string },
    EnvironmentName: { type: types.string },
    OptionSettings: { type: types.array },
    SolutionStackName: { type: types.string },
    TemplateName: { type: types.string },
    Tier: { type: EnvironmentTierType },
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
