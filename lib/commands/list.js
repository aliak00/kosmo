 var _ = require('lodash')
    , componentUtils = require('../component-utils')
    , Project = require('../project');

var S3_BUCKET_MAX_LENGTH = 63;
var DEFAULT_BUCKET_REGION = 'eu-west-1';

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    if (_(opts.argv).isEmpty()) {
        throw new Error('Missing project reference');
    } else if (opts.argv.length !== 1) {
        throw new Error('Too many project references specified');
    }

    this.project = new Project(opts.argv[0]);
}

Command.options = [];
Command.usageText = 'project_name';
Command.descriptionText = 'List components and artifacts in project';
Command.skipAws = true;

Command.prototype.execute = function() {

    this.project.load(componentUtils.bind({
        projectName: this.project.name,
    }));

    if (this.project.components().length > 0) {
        console.log('Components:');
        _.forEach(this.project.components(), component => {
            console.log(` * ${component}`);
        });
        console.log('');
    }

    if (this.project.components().length > 0) {
        console.log('Artifacts:');
        _.forEach(this.project.artifacts(), artifact => {
            console.log(` * ${artifact}`);
        });
    }
}

module.exports = Command;
