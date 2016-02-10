var _ = require('lodash')
    , novalib = require('../nova-lib')
    , Project = require('../project');

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

    this.project.load(novalib.init({
        projectName: this.project.name,
    }));

    if (this.project.getComponents().length > 0) {
        console.log('Components:');
        _.forEach(this.project.getComponents(), component => {
            console.log(` * ${component}`);
        });
        console.log('');
    }

    if (this.project.getArtifacts().length > 0) {
        console.log('Artifacts:');
        _.forEach(this.project.getArtifacts(), artifact => {
            console.log(` * ${artifact}`);
        });
    }
};

module.exports = Command;
