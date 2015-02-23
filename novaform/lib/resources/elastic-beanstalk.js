var Resource = require('../resource');

function Application(name, properties) {
    if (!(this instanceof Application)) {
        return new Application(name, properties);
    }

    Resource.call(this, 'AWS::ElasticBeanstalk::Application', name, properties);

}
Application.prototype = Object.create(Resource.prototype);

function ApplicationVersion(name, properties) {
    if (!(this instanceof ApplicationVersion)) {
        return new ApplicationVersion(name, properties);
    }

    Resource.call(this, 'AWS::ElasticBeanstalk::ApplicationVersion', name, properties);
}
ApplicationVersion.prototype = Object.create(Resource.prototype);

function ConfigurationTemplate(name, properties) {
    if (!(this instanceof ConfigurationTemplate)) {
        return new ConfigurationTemplate(name, properties);
    }

    Resource.call(this, 'AWS::ElasticBeanstalk::ConfigurationTemplate', name, properties);
}
ConfigurationTemplate.prototype = Object.create(Resource.prototype);

function Environment(name, properties) {
    if (!(this instanceof Environment)) {
        return new Environment(name, properties);
    }

    Resource.call(this, 'AWS::ElasticBeanstalk::Environment', name, properties);
}
Environment.prototype = Object.create(Resource.prototype);

module.exports = {
    Application: Application,
    ApplicationVersion: ApplicationVersion,
    ConfigurationTemplate: ConfigurationTemplate,
    Environment: Environment
};
