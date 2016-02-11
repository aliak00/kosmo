var _ = require('lodash')
    , AWS = require('aws-sdk')
    , Artifact = require('../artifact')
    , CfnStack = require('../aws-utils/cfn-stack')
    , Component = require('../component')
    , moment = require('moment')
    , novalib = require('../nova-lib')
    , ProjectRef = require('../project-ref')
    , Project = require('../project')
    , utils = require('../utils');

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.options = opts.options;

    if (_(opts.argv).isEmpty()) {
        throw new Error('Missing project reference');
    } else if (opts.argv.length !== 1) {
        throw new Error('Too many project references specified');
    }

    var ref = ProjectRef.parse(opts.argv[0]);
    this.project = new Project(ref.name);
}

Command.options = [];
Command.usageText = 'project_name';
Command.descriptionText = 'Show the current status of components and artifacts in project';

Command.prototype.execute = function() {

    this.project.load(novalib.init({
        projectName: this.project.name,
    }));

    var componentPromises = _.map(this.project.getComponents(), component => {
        var componentDef = this.project.findComponent(component);
        var stackName = Component.makeStackName(this.project.name, component);
        var cfn = new AWS.CloudFormation({ region: componentDef.region });
        return CfnStack.getStackInfo(cfn, stackName).then(null, err => {
            if (err === CfnStack.Status.DOES_NOT_EXIST) {
                return new CfnStack(stackName, CfnStack.Status.DOES_NOT_EXIST);
            }
            throw err;
        });
    });

    var dateFormat = 'DD/MM/YYYY - HH:mm:ss';

    return Promise.all(componentPromises).then(values => {

        if (this.project.getComponents().length) {
            console.log('\n== Components ==\n');
        }

        var stacks = utils.zipObject(this.project.getComponents(), values);
        _.forEach(stacks, (stack, name) => {
            var componentDef = this.project.findComponent(name);
            console.log(`* Name: ${name}`);
            console.log(`  Cfn name: ${Component.makeStackName(this.project.name, name)}`);
            console.log(`  Status: ${stack.status}`);
            if (stack.status === CfnStack.Status.DOES_NOT_EXIST) {
                console.log();
                return;
            }
            console.log(`  Deploy date: ${moment.utc(stack.outputs.novaId).format(dateFormat)}`);
            console.log(`  Region: ${componentDef.region}`);
            if (_.keys(stack.outputs).length > 1) {
                console.log('  Outputs:');
            }
            _.forEach(stack.outputs, (value, key) => {
                if (key === 'novaId') {
                    return;
                }
                console.log(`     ${key}: ${value}`);
            });
            console.log();
        });
    }).then(() => {
        var artifactPromises = _.map(this.project.getArtifacts(), artifact => {
            return Artifact.getMeta(this.project.name, artifact);
        });

        return Promise.all(artifactPromises);
    }).then(values => {

        if (this.project.getArtifacts().length) {
            console.log('\n== Artifacts ==\n');
        }

        var artifacts = utils.zipObject(this.project.getArtifacts(), values);
        _.forEach(artifacts, (artifact, name) => {
            var artifactDef = this.project.findArtifact(name);
            console.log(`* Name: ${name}`);
            if (!artifact) {
                console.log('  Build date: Not built');
                console.log();
                return;
            }
            console.log(`  Build date: ${moment.utc(artifact.timestamp).format(dateFormat)}`);
            console.log(`  Regions: ${artifactDef.region}`);
            console.log();
        });
    });
};

module.exports = Command;
