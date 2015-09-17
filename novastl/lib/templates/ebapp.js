var Template = require('../template')
    , novaform = require('novaform');

function EBApp(options) {
    if (!(this instanceof EBApp)) {
        return new EBApp(options);
    }

    Template.call(this);

    var name = options.name;
    var optionSettings = options.optionSettings;
    var artifact = options.artifact;

    var cname = name.charAt(0).toUpperCase() + name.slice(1);
    function makeName(str) {
        return cname + str;
    }

    var app = novaform.eb.Application(makeName('App'), {
        ApplicationName: name,
        Description: name + ' application',
    });

    var configTemplate = novaform.eb.ConfigurationTemplate(makeName('ConfigTemplate'), {
        ApplicationName: app,
        Description: name + ' configution template',
        SolutionStackName: '64bit Amazon Linux 2015.03 v2.0.0 running Node.js',
        OptionSettings: optionSettings,
    });

    var version = novaform.eb.ApplicationVersion(makeName('Version'), {
        Description: artifact.timestamp,
        ApplicationName: app,
        SourceBundle: {
            S3Bucket: artifact.bucket,
            S3Key: artifact.key,
        },
    });

    var environment = novaform.eb.Environment(makeName('Environment'), {
        Description: name + ' environment',
        ApplicationName: name,
        TemplateName: configTemplate,
        VersionLabel: version,
    });

    this.app = this._addResource(app);
    this.configTemplate = this._addResource(configTemplate);
    this.version = this._addResource(version);
    this.environment = this._addResource(environment);
}
EBApp.prototype = Object.create(Template.prototype);

module.exports = EBApp;
