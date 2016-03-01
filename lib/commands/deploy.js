var _ = require('lodash')
    , AWS = require('aws-sdk')
    , Artifact = require('../artifact')
    , CfnStack = require('../aws-utils/cfn-stack')
    , Component = require('../component')
    , fs = require('fs')
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

    var ref = ProjectRef.parse(opts.argv[0]);
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
    ['', 'region=ARG', 'Explicitly specify region if you want to overwrite the component definition region'],
];
Command.usageText = '[options] project_name/component_name';
Command.descriptionText = 'Deploys project component';

function waitForStack(stackName, region, shouldStopCallback, checkInterval) {
    return new Promise((resolve, reject) => {
        var cfn = new AWS.CloudFormation({ region: region });
        checkInterval = checkInterval || 1000;
        function f() {
            CfnStack.getStackStatus(cfn, stackName).then(status => {
                var shouldStop = shouldStopCallback(status);
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
}

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

// TODO: Move this to Component.setMeta
function updateMetaData(projectName, componentName, metaData) {
    var novaBucket = program.getNovaBucket();
    var s3 = new AWS.S3({ region: novaBucket.region });

    var latestMetaKeyPath = path.join(
        'meta',
        projectName,
        'templates',
        componentName,
        'latest.json'
        );
    var getObject = utils.pbind(s3.getObject, s3, {
        Bucket: novaBucket.name,
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
            Bucket: novaBucket.name,
            Key: latestMetaKeyPath,
            Body: JSON.stringify(metaData, null, 2),
        });

        var uploadPreviousPromise = previousMeta
            ? upload({
                Bucket: novaBucket.name,
                Key: metaData.previousMeta,
                Body: JSON.stringify(previousMeta, null, 2),
            })
            : null;

        return Promise.all(_.compact([uploadLatestPromise, uploadPreviousPromise]));
    });
}

function walkDependencies(componentRefs, walked) {
    if (!componentRefs.length) {
        return Promise.resolve([]);
    }
    var metaPromises = _.map(componentRefs, componentRef => {
        var ref = ProjectRef.parse(componentRef);
        return Component.getMeta(ref.name, ref.subname).then(meta => {
            if (!meta) {
                throw new NovaError('Unknown dependency: ' + componentRef);
            }
            if (_.includes(walked, meta.dependencies.components)) {
                throw new NovaError('Recursive dependency found.');
            }
            return meta.dependencies.components;
        });
    });
    return Promise.all(metaPromises)
        .then(_.flatten)
        .then(values => {
            if (!values.length) {
                return componentRefs;
            }
            return walkDependencies(values, walked.concat(values))
                .then(_.partial(_.concat, componentRefs));
        });
}

function fetchRegions(componentRefs) {
    var metaPromises = _.map(componentRefs, componentRef => {
        var ref = ProjectRef.parse(componentRef);
        return Component.getMeta(ref.name, ref.subname).then(meta => {
            return {
                ref: componentRef,
                region: meta.region,
            };
        });
    });
    return Promise.all(metaPromises);
}

function fetchOutputs(refInfos) {
    var stackInfoPromises = _.map(refInfos, refInfo => {
        var ref = ProjectRef.parse(refInfo.ref);
        var stackName = Component.makeStackName(ref.name, ref.subname);
        var cfn = new AWS.CloudFormation({ region : refInfo.region });
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
        return utils.zipObject(_.map(refInfos, 'ref'), outputs);
    }, err => {
        if (err === CfnStack.Status.DOES_NOT_EXIST) {
            throw new Error('One of the dependent stacks is not yet deployed!');
        }
        throw err;
    });
}

function fetchComponentDependencies(componentRefs, thisRef) {
    return walkDependencies(componentRefs, [thisRef])
        .then(fetchRegions)
        .then(fetchOutputs);
}

function fetchArtifactDependencies(artifactRefs) {
    var artifactPromises = _.map(artifactRefs, artifactRef => {
        var ref = ProjectRef.parse(artifactRef);
        return Artifact.getMeta(ref.name, ref.subname).then(meta => {
            return _.map(meta.artifacts, (artifactData, region) => {
                return {
                    ref: artifactRef,
                    region: region,
                    data: {
                        timestamp: meta.timestamp,
                        bucket: artifactData.bucket,
                        key: artifactData.key,
                    },
                };
            });
        });
    });
    return Promise.all(artifactPromises)
        .then(_.flatten)
        .then(values => {
            return _.reduce(values, (memo, value) => {
                _.set(memo, `${value.ref}.${value.region}`, value.data);
                return memo;
            }, {});
        });
}

function fetchDependencies(dependencies, thisRef) {
    return Promise.all([
        fetchComponentDependencies(dependencies.components, thisRef),
        fetchArtifactDependencies(dependencies.artifacts),
    ]).then(values => {
        return {
            components: values[0],
            artifacts: values[1],
        };
    });
}

Command.prototype.execute = function() {
    if (program.options.verbose) {
        console.log('Loading project ' + this.project.name);
    }

    this.project.load(novalib.init({
        projectName: this.project.name,
    }));

    this.componentDef = this.project.findComponent(this.componentName);
    if (!this.componentDef) {
        throw new Error(`Failed to find component '${this.componentName}' in project '${this.project.name}'`);
    }

    this.componentDef.region = this.commandOptions.region || this.componentDef.region;
    if (!this.componentDef.region) {
        throw new NovaError('You must specifiy a region to deploy this component to.')
    }
    if (typeof this.componentDef.region !== 'string') {
        throw new NovaError('Component region must be type string.');
    }

    this.stackName = Component.makeStackName(this.project.name, this.componentName);

    if (program.options.verbose) {
        console.log('Checking dependencies...');
    }

    var thisRef = Project.makeFullRef(this.project.name, this.componentDef.name);
    return fetchDependencies(this.project.getDependencies(this.componentDef.name), thisRef).then(dependencyData => {
        if (program.options.verbose) {
            console.log('Building component ' + this.componentName);
        }

        var projectName = this.project.name;
        var componentRegion = this.componentDef.region;
        this.context = {
            region: componentRegion,
            getArtifact: function(name, region) {
                region = region || componentRegion;
                var ref = Project.makeFullRef(projectName, name);
                var artifact = dependencyData.artifacts[ref][region];
                if (!artifact) {
                    throw new NovaError(`Failed to find artifact dependency '${name}' in region ${region}.`);
                }
                return artifact;
            },

            getComponent: function(name) {
                var ref = Project.makeFullRef(projectName, name);
                var component = dependencyData.components[ref];
                if (!component) {
                    throw new NovaError(`Failed to find component dependency '${name}'.`);
                }
                return component;
            },

            getOutput: function(componentName, prop, defaultValue) {
                var component = this.getComponent(componentName);
                var value = _.get(component, prop, defaultValue);
                if (!value && !defaultValue) {
                    throw new NovaError(`Failed to find output '${prop}' in component '${componentName}'.`);
                }
                return value;
            },
        };
        return utils.pdone(this.componentDef.build, this.componentDef, this.context);
    }).then(buildResult => {
        this.buildResult = buildResult;
        this.buildResult.novaId = moment().utc().format('YYYYMMDDTHHmmss');

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
        stack.add(_.map(buildResult.parameters, 'param'));
        stack.add(buildResult.outputs || []);

        if (stack.isEmpty()) {
            throw new NovaError('Stack empty. We can pretend it was a success though.');
        }

        stack.add(novaform.Output('novaId', this.buildResult.novaId));

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

        var novaBucket = program.getNovaBucket();
        var keyPath = path.join(
            'meta',
            this.project.name,
            'tmp',
            'template-to-validate.json');

        var s3 = new AWS.S3({ region: novaBucket.region });
        var upload = utils.pbind(s3.upload, s3, {
            Bucket: novaBucket.name,
            Key: keyPath,
            Body: templateBody,
        });
        return upload().then(data => {
            var cfn = new AWS.CloudFormation({ region: this.componentDef.region });
            var validateTemplate = utils.pbind(cfn.validateTemplate, cfn, {
                TemplateURL: data.Location,
            });
            return validateTemplate();
        }).then(() => {
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

        var novaBucket = program.getNovaBucket();
        var s3 = new AWS.S3({ region: novaBucket.region });

        var upload = utils.pbind(s3.upload, s3);
        if (this.commandOptions.noop) {
            upload = () => Promise.resolve({ Location: 'noop-location' });
        }

        var timestamp = moment().utc().format('YYYYMMDDTHHmmss');
        var keyPath = path.join(
            'data',
            this.project.name,
            'templates',
            this.componentName,
            timestamp + '.json'
            );

        return upload({
            Bucket: novaBucket.name,
            Key: keyPath,
            Body: templateBody,
        }).then(data => {
            this.templateMetaData = {
                timestamp: this.buildResult.novaId,
                region: this.componentDef.region,
                keyPath: keyPath,
                location: data.Location,
            };
        }).then(() => {
            if (program.options.verbose) {
                console.log('Checking cloudformation stack status...');
            }

            return ensureStackStateOk(this.stackName, this.componentDef.region, this.commandOptions.noop);
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
                    ParameterValue: paramObject.value,
                };
            });

            if (this.commandOptions.noop) {
                return 'noop-stack-id';
            }

            var params = {
                Capabilities: [ 'CAPABILITY_IAM' ], // TODO: Only use this is template validations says to
                StackName: this.stackName,
                TemplateURL: this.templateMetaData.location,
                Parameters: parameters,
            };

            var notificationArns;
            if (typeof this.componentDef.notificationArns === 'function') {
                notificationArns = this.componentDef.notificationArns(this.context);
                if (!(notificationArns instanceof Array)) {
                    notificationArns = [notificationArns];
                }
                params.NotificationARNs = notificationArns;
            }

            var cfn = new AWS.CloudFormation({ region: this.componentDef.region });
            var promise;
            if (status === CfnStack.Status.DOES_NOT_EXIST) {
                params.Tags = [
                    { Key: 'nova-project-name', Value: this.project.name },
                    { Key: 'nova-component-name', Value: this.componentName },
                    { Key: 'nova-initial-id', Value: this.buildResult.novaId },
                ];
                promise = utils.pbind(cfn.createStack, cfn, params);
            } else {
                if (!CfnStack.isStatusComplete(status)) {
                    // already in progress?
                    throw new NovaError(util.format('Stack is not in a valid state for deployment: %s', status));
                }
                promise = utils.pbind(cfn.updateStack, cfn, params);
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
            this.templateMetaData.dependencies = this.project.getDependencies(this.componentDef.name);

            if (program.options.verbose) {
                console.log('Updating meta data...');
            }

            if (this.commandOptions.noop) {
                return;
            }

            return updateMetaData(this.project.name, this.componentName, this.templateMetaData);
        }).then(() => {
            if (!this.commandOptions.wait) {
                return;
            }

            process.stdout.write('Waiting for stack ...');

            if (this.commandOptions.noop) {
                process.stdout.write(' not\n');
                return;
            }
            return waitForStack(this.stackName, this.componentDef.region, status => {
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
            }).then(() => {
                var cfn = new AWS.CloudFormation({ region: this.componentDef.region });
                return CfnStack.getStackInfo(cfn, this.stackName);
            }).then(stack => {
                if (!program.options.verbose) {
                    return;
                }

                if (stack.outputs) {
                    console.log('Outputs:');
                }
                _.forEach(stack.outputs, (value, key) => {
                    console.log(` * ${key}: ${value}`);
                });
            });
        });
    });
};

module.exports = Command;
