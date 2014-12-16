var Resource = require('./../resource');

function var Resource = require('./../resource');

function Application(name, properties) {
    if (!(this instanceof Application)) {
        return new Application(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::ElasticBeanstalk::Application';
    this.name = name;

}
Application.prototype = Object.create(Resource.prototype);

function ApplicationVersion(name, properties) {
    if (!(this instanceof ApplicationVersion)) {
        return new ApplicationVersion(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::ElasticBeanstalk::ApplicationVersion';
    this.name = name;

}
ApplicationVersion.prototype = Object.create(Resource.prototype);

function ConfigurationTemplate(name, properties) {
    if (!(this instanceof ConfigurationTemplate)) {
        return new ConfigurationTemplate(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::ElasticBeanstalk::ConfigurationTemplate';
    this.name = name;

}
ConfigurationTemplate.prototype = Object.create(Resource.prototype);

function Environment(name, properties) {
    if (!(this instanceof Environment)) {
        return new Environment(name, properties);
    }

    this.properties = properties;
    this.type = 'AWS::ElasticBeanstalk::Environment';
    this.name = name;

}
Environment.prototype = Object.create(Resource.prototype);

module.exports = {
    Application: Application,
    ApplicationVersion: ApplicationVersion,
    ConfigurationTemplate: ConfigurationTemplate,
    Environment: Environment
};