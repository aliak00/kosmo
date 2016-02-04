var _ = require('lodash')
    , AWS = require('aws-sdk')
    , changeCase = require('change-case')
    , CfnStack = require('../aws-utils/cfn-stack')
    , novalib = require('../nova-lib')
    , NovaError = require('../nova-error')
    , moment = require('moment')
    , novaform = require('../novaform')
    , novastl = require('../novastl')
    , path = require('path')
    , program = require('../program')
    , ProjectRef = require('../project-ref')
    , Project = require('../project')
    , utils = require('../utils')
    , util = require('util');

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.opts = opts;
    this.commandOptions = this.opts.options;

    if (_(opts.argv).isEmpty()) {
        throw new Error('Missing project/component reference');
    } else if (opts.argv.length !== 1) {
        throw new Error('Too many project/component references specified');
    }

    var ref = new ProjectRef(opts.argv[0]);
    this.project = new Project(ref.name);
    this.componentName = ref.subname;

    if (!this.componentName) {
        throw new Error('Deploy command needs a component name.');
    }
}

Command.options = [
    ['w', 'wait', 'Wait for completion'],
    ['n', 'noop', 'Do not actually deploy. But generates stack and validates it.'],
    ['', 'template-output=ARG', 'Dump the generated CloudFormation template to a file'],
];
Command.usageText = '[options] project_name/component_name';
Command.descriptionText = 'Deploys project component';

function makeStackName(projectName, componentName) {
    return changeCase.pascal(projectName + ' ' + componentName);
}

function waitForStack(stackName, region, shouldStopCallback, checkInterval) {
    return new Promise((resolve, reject) => {
        var cfn = new AWS.CloudFormation({ region: region });
        checkInterval = checkInterval || 1000;
        function f() {
            CfnStack.getStackStatus(cfn, stackName).then(status => {
                var shouldStop = shouldStopCallback(status)
                if (shouldStop) {
                    return resolve();
                }
                setTimeout(f, checkInterval);
            }).catch (err => {
                reject(err);
            });
        }
        f();
    });
};

function ensureStackStateOk(stackName, region, noop) {
    var cfn = new AWS.CloudFormation({ region: region });
    return CfnStack.getStackStatus(cfn, stackName).then(status => {
        if (status !== CfnStack.Status.ROLLBACK_COMPLETE) {
            return status;
        }

        if (noop) {
            console.log('Stack ' + stackName + ' is stuck in a rollback state.');
            return CfnStack.Status.ROLLBACK_COMPLETE;
        }

        var question = util.format(
            'Stack %s is stuck in a rollback state. Would you like nova to delete it for you and then continue?',
            stackName
            );
        return utils.yesorno(question).then(shouldDelete => {
            if (!shouldDelete) {
                return Promise.reject('Stack is in inconsistent state. Cannot deploy.');
            }

            var deleteStack = utils.pbind(cfn.deleteStack, cfn, {
                StackName: stackName,
            });
            return deleteStack().then(() => {
                process.stdout.write('Deleting stack ...');
                return waitForStack(stackName, region, status => {
                    if (status === CfnStack.Status.DOES_NOT_EXIST) {
                        return true;
                    }
                    process.stdout.write('.');
                }).then(() => {
                    process.stdout.write(' done! \n');
                    return CfnStack.Status.DOES_NOT_EXIST;
                }, err => {
                    process.stdout.write('\n');
                    throw err;
                });
            });
        });
    });
}

function updateMetaData(projectName, componentName, metaData) {
    var rootBucket = program.getRootBucket();
    var s3 = new AWS.S3({ region: rootBucket.region });

    var latestMetaKeyPath = path.join(
        'meta',
        projectName,
        'templates',
        componentName,
        'latest.json'
        );
    getObject = utils.pbind(s3.getObject, s3, {
        Bucket: rootBucket.name,
        Key: latestMetaKeyPath,
    });
    return getObject().then(data => {
        return JSON.parse(data.Body.toString());
    }, err => {
        if (err.code === 'NoSuchKey') {
            return '';
        }
        throw err;
    }).then(previousMeta => {
        if (previousMeta) {
            metaData.previousMeta = `meta/${projectName}/templates/${componentName}/${previousMeta.timestamp}.json`;
        }

        var upload = utils.pbind(s3.upload, s3);

        var uploadLatestPromise = upload({
            Bucket: rootBucket.name,
            Key: latestMetaKeyPath,
            Body: JSON.stringify(metaData, null, 2),
        });

        var uploadPreviousPromise = previousMeta
            ? upload({
                Bucket: rootBucket.name,
                Key: metaData.previousMeta,
                Body: JSON.stringify(previousMeta, null, 2),
            })
            : null;

        return Promise.all(_.compact([uploadLatestPromise, uploadPreviousPromise]));
    });
}

Command.prototype.execute = function() {
    if (program.options.verbose) {
        console.log('Loading project ' + this.project.name);
    }

    this.project.load(novalib.init({
        projectName: this.project.name,
    }));

    var componentDef = this.project.findComponent(this.componentName);
    if (!componentDef) {
        throw new Error(`Failed to find component '${this.componentName}' in project '${this.project.name}'`);
    }

    this.stackName = makeStackName(this.project.name, this.componentName)
    var dependantComponents = this.project.getComponentDependencies(this.componentName);

    if (program.options.verbose) {
        console.log('Fetching outputs of dependent stacks.');
    }

    var stackInfoPromises = _.map(dependantComponents, componentName => {
        dependantComponentDef = this.project.findComponent(componentName);
        stackName = makeStackName(this.project.name, dependantComponentDef.name);
        var cfn = new AWS.CloudFormation({ region : dependantComponentDef.region });
        return CfnStack.getStackInfo(cfn, stackName);
    });

    return Promise.all(stackInfoPromises).then(values => {
        var invalidStacks = _.filter(values, function(stackInfo) {
            return !CfnStack.isStatusValidCompleteState(stackInfo.status);
        });
        if (invalidStacks.length !== 0) {
            throw new Error('One of the dependent stacks is not yet deployed!');
        }
        var outputs = _.map(values, function(stackInfo) {
            return stackInfo.outputs;
        });
        return utils.zipObject(dependantComponents, outputs);
    }, err => {
        if (err === CfnStack.Status.DOES_NOT_EXIST) {
            throw new Error('One of the dependent stacks is not yet deployed!');
        }
        throw e;
    }).then(dependencyObject => {
        if (program.options.verbose) {
            console.log('Building component ' + this.componentName);
        }

        return utils.pdone(componentDef.build, componentDef, dependencyObject);
    }).then(buildResult => {
        this.buildResult = buildResult;
        if (program.options.verbose) {
            console.log('Generating cloudformation template...');
        }

        if (buildResult.resources && !(buildResult.resources instanceof Array)) {
            throw new Error('component resources must be array');
        }

        if (buildResult.outputs && !(buildResult.outputs instanceof Array)) {
            throw new Error('component outputs must be array');
        }

        if (buildResult.parameters && !(buildResult.parameters instanceof Array)) {
            throw new Error('component parameters must be array');
        }

        var stack = novaform.Stack(this.stackName);

        // Allow nova definition file components to be stl templates, we can extract the
        // resources ourselves then
        var resources = _.reduce(buildResult.resources, (memo, resource) => {
            if (resource instanceof novastl.Template) {
                return memo.concat(resource.resources());
            }
            return memo.concat(resource);
        }, []);

        stack.add(resources);
        stack.add(buildResult.outputs || []);
        stack.add(_.map(buildResult.parameters, 'param'));

        if (stack.isEmpty()) {
            throw new NovaError('Stack empty. We can pretend it was a success though.');
        }

        var templateBody = stack.toJson();

        // Output template if reuquested
        var templateOutput = this.commandOptions['template-output'];
        if (templateOutput === '-') {
            console.log(templateBody);
        } else if (templateOutput) {
            var fd = fs.openSync(templateOutput, 'w');
            fs.writeSync(fd, templateBody);
            fs.closeSync(fd);
        }

        return templateBody;
    }).then(templateBody => {
        if (program.options.verbose) {
            console.log('Validating cloudformation template ...');
        }

        var rootBucket = program.getRootBucket();
        var keyPath = path.join(
            'meta',
            this.project.name,
            'tmp',
            'template-to-validate.json');

        var s3 = new AWS.S3({ region: rootBucket.region });
        var upload = utils.pbind(s3.upload, s3, {
            Bucket: rootBucket.name,
            Key: keyPath,
            Body: templateBody,
        });
        return upload().then(data => {
            var cfn = new AWS.CloudFormation({ region: componentDef.region });
            var validateTemplate = utils.pbind(cfn.validateTemplate, cfn, {
                TemplateURL: data.Location,
            });
            return validateTemplate();
        }).then(data => {
            return templateBody;
        }, err => {
            if (err.code === 'ValidationError') {
                var message = 'AWS says your template is silly - ' + err.message;
                throw new NovaError(message);
            }
            throw err;
        });
    }).then(templateBody => {
        if (program.options.verbose) {
            console.log('Uploading cloudformation template to S3...');
        }

        var rootBucket = program.getRootBucket();
        var s3 = new AWS.S3({ region: rootBucket.region });

        var timestamp = moment().utc().format('YYYYMMDDTHHmmss');
        var keyPath = path.join(
            'data',
            this.project.name,
            'templates',
            this.componentName,
            timestamp + '.json'
            );

        var upload = utils.pbind(s3.upload, s3);
        return upload({
            Bucket: rootBucket.name,
            Key: keyPath,
            Body: templateBody,
        }).then(data => {
            this.templateMetaData = {
                timestamp: timestamp,
                region: componentDef.region,
                keyPath: keyPath,
                location: data.Location,
            };
        }).then(() => {
            if (program.options.verbose) {
                console.log('Checking cloudformation stack status...');
            }

            return ensureStackStateOk(this.stackName, componentDef.region, this.commandOptions.noop);
        }).then(status => {
            if (program.options.verbose) {
                console.log('Deploying cloudformation stack...');
            }

            var parameters = _.map(this.buildResult.parameters, function(paramObject){
                if (paramObject.value === null || typeof paramObject.value === 'undefined') {
                    throw new Error(`Parameter values for '${paramObject.param.name}' cannot be null`);
                }
                return {
                    ParameterKey: paramObject.param.name,
                    ParameterValue: paramObject.value
                };
            });

            if (this.commandOptions.noop) {
                return 'noop-stack-id';
            }

            var cfn = new AWS.CloudFormation({ region: componentDef.region });
            var promise;
            if (status === CfnStack.Status.DOES_NOT_EXIST) {
                promise = utils.pbind(cfn.createStack, cfn, {
                    Capabilities: [ 'CAPABILITY_IAM' ], // TODO: Only use this is template validations says to
                    StackName: this.stackName,
                    TemplateURL: this.templateMetaData.location,
                    Tags: [
                        { Key: 'nova-project-name', Value: this.project.name },
                        { Key: 'nova-component-name', Value: this.componentName },
                    ],
                    Parameters: parameters,
                });
            } else {
                if (!CfnStack.isStatusComplete(status)) {
                    // already in progress?
                    throw new NovaError(util.format('Stack is not in a valid state for deployment: %s', status));
                }
                promise = utils.pbind(cfn.updateStack, cfn, {
                    Capabilities: [ 'CAPABILITY_IAM' ], // TODO: Only use this is template validations says to
                    StackName: this.stackName,
                    TemplateURL: this.templateMetaData.location,
                    Parameters: parameters,
                });
            }

            return promise().then(data => {
                return data.StackId;
            }, err => {
                if (err.code === 'ValidationError') {
                    var message = 'AWS says your template no good - ' + err.message;
                    throw new NovaError(message);
                }

                throw err;
            });
        }).then(stackId => {
            if (program.options.verbose) {
                console.log('Deployed stack id ' + stackId);
            }
            this.templateMetaData.stackId = stackId;

            if (program.options.verbose) {
                console.log('Updating meta data...');
            }

            if (this.commandOptions.noop) {
                return;
            }

            return updateMetaData(this.project.name, this.componentName, this.templateMetaData);
        }).then(() => {
            if (this.commandOptions.wait) {
                process.stdout.write('Waiting for stack ...');

                if (this.commandOptions.noop) {
                    process.stdout.write(' not\n');
                    return;
                }
                return waitForStack(this.stackName, componentDef.region, status => {
                    if (CfnStack.isStatusFailed(status)
                        || CfnStack.isStatusRolledBack(status)
                        || CfnStack.isStatusRollingback(status)) {
                        // TODO: revert meta data update?
                        throw new NovaError(util.format('Stack deployment failed: %s', status));
                    }
                    if (CfnStack.isStatusComplete(status)) {
                        return true;
                    }

                    process.stdout.write('.');
                }).then(() => {
                    process.stdout.write(' done! \n');
                }, err => {
                    process.stdout.write('\n');
                    throw err;
                });
            }
        });
    });

};

module.exports = Command;
