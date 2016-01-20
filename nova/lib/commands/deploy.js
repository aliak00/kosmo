var getopt = require('node-getopt')
    , q = require('q')
    , _ = require('lodash')
    , util = require('util')
    , fs = require('fs')
    , novautils = require('../component-utils')
    , novaform = require('novaform')
    , novastl = require('novastl')
    , AWS = require('aws-sdk')
    , uuid = require('node-uuid')
    , moment = require('moment')
    , Stack = require('../stack')
    , s3utils = require('../s3utils')
    , config = require('../configuration')
    , Project = require('../project')
    , Ref = require('../ref')
    , assert = require('assert');

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

    var ref = opts.argv[0];
    ref = this.ref = Ref.parse(ref);
    if (!this.ref) {
        throw new Error('Invalid project ref');
    }
    if (!this.ref.component) {
        throw new Error('Component was not specified');
    }

    this.project = Project.load(this.ref.project, config.paramsObject, function(e) {
        throw new Error(util.format('Failed to load project "%s": %s', ref.project, e.message));
    });

    if (!this.project) {
        throw new Error(util.format('Could not find project "%s"', this.ref.project));
    }

    this.component = this.project.findComponent(this.ref.component);
    if (!this.component) {
        throw new Error(util.format('Component "%s" does not exist', this.ref.component));
    }
}

Command.options = [
    ['w', 'wait', 'Wait for completion'],
    ['n', 'noop', 'Do not actually deploy'],
    ['', 'template-output=ARG', 'Dump the generated CloudFormation template to a file'],
];
Command.usageText = '[options] project_name/component_name'
Command.descriptionText = 'Deploys project component';

Command.prototype._waitForStack = function(options, shouldStopCallback) {
    var cfn = options.cfn;
    var stackName = options.stackName;
    var maxWaitSeconds = options.maxWaitSeconds || 15 * 60;
    var waitSeconds = options.waitSeconds || 1;

    var start = moment();
    var maxEnd = moment(start);
    maxEnd.add(maxWaitSeconds, 'seconds');

    var getStackStatus = q.nbind(Stack.getStackStatus, Stack);

    var f = function() {
        return getStackStatus(cfn, stackName).then(function(status) {
            var callbackResult = shouldStopCallback(status);
            if (callbackResult) {
                return callbackResult;
            }
            if (moment().isAfter(maxEnd)) {
                throw new Error('Timeout');
            }
            return q.delay(waitSeconds * 1000).then(f);
        });
    };

    return f();
};

Command.prototype.execute = function() {
    var that = this;

    return q().then(function() {
        // init deployment

        var stackName = that.ref.makeStackName();

        var deploymentDate = moment.utc();
        var deploymentId = uuid.v4();

        config.currentDeployment.id = deploymentId;
        config.currentDeployment.date = deploymentDate;
        config.currentDeployment.ref = that.ref;
        config.currentDeployment.region = that.component.region;

        return {
            projectName: that.ref.project,
            componentName: that.ref.component,
            deploymentDate: deploymentDate,
            deploymentId: deploymentId,
            stackName: stackName,
        };
    }).then(function(deploymentConfig) {
        var region = that.component.region;
        var cfn = that.cfn = new AWS.CloudFormation({ region : region });
        return _.extend(deploymentConfig, {
            cfn: cfn,
        });
    }).then(function(deploymentConfig) {
        // TODO: validate project's components, make sure dependencies exist
        var deplist = [];

        function walkDeps(result, componentName, walked) {
            if (!walked) {
                walked = [];
            }
            if (walked.indexOf(componentName) !== -1) {
                throw new Error('recursive dependency');
            }

            walked.push(componentName);

            var component = that.project.findComponent(componentName);
            if (!component) {
                throw new Error(util.format('Could not find dependent component "%s"', componentName));
            }
            var deps = _.map(component.dependencies, function(depname) {
                var w = walked ? walked.slice() : [];
                return walkDeps([depname], depname, w);
            });

            deps.sort(function(a, b) { return a.length - b.length; });

            deps.forEach(function(deps) {
                deps.reverse();
                deps.forEach(function(d) {
                    var idx = result.indexOf(d);
                    if (idx !== -1) {
                        result.splice(idx, 1);
                    }
                    result.unshift(d);
                });
            });

            return result;
        }

        var deplist = walkDeps([], that.component.name);

        return _.extend(deploymentConfig, {
            dependentComponents: deplist,
        });
    }).then(function(deploymentConfig) {
        if (config.programOptions.verbose) {
            console.log('Fetching outputs of dependent stacks...');
        }

        var componentNames = deploymentConfig.dependentComponents;

        var stackInfoPromises = componentNames.map(function(depname) {
            var component = that.project.findComponent(depname);
            if (!component) {
                throw new Error(util.format('Dependent component "%s" does not exist', depname));
            }
            var region = component.region;

            var stackName = Ref(that.ref.project, depname).makeStackName();

            var cfn = new AWS.CloudFormation({ region : region });
            var getStackInfo = q.nbind(Stack.getStackInfo, Stack);
            return getStackInfo(cfn, stackName);
        });

        return q.all(stackInfoPromises).then(function(stackInfos) {
            var invalidStacks = _.filter(stackInfos, function(stackInfo) {
                return !Stack.isStatusValidCompleteState(stackInfo.status);
            });
            if (invalidStacks.length !== 0) {
                throw new Error('One of the dependent stacks is not yet deployed!');
            }
            var outputs = _.map(stackInfos, function(stackInfo) {
                return stackInfo.outputs;
            });
            var dependencyObject = _.object(_.zip(componentNames, outputs));
            return _.extend(deploymentConfig, {
                dependencies: dependencyObject
            });
        }).catch(function(e) {
            if (e === Stack.Status.DOES_NOT_EXIST) {
                throw new Error('One of the dependent stacks is not yet deployed!');
            }
            throw e;
        });
    }).then(function(deploymentConfig) {
        if (config.programOptions.verbose) {
            console.log('Building component...');
        }

        function returnResult(result) {
            return _.extend(deploymentConfig, {
                buildResult: result,
            });
        }

        var doneDeferred = q.defer();

        var options = {}; // Currently unused but reserved for the future use.
        var result = that.component.build(deploymentConfig.dependencies, options, doneDeferred.makeNodeResolver());
        if (typeof result === 'undefined') {
            // looks like component wants to use async building, lets wait for done callback to be called.
            return doneDeferred.promise.then(returnResult);
        } else if (q.isPromiseAlike(result)) {
            // async building with promises. Assume build() returned a promise
            return result.then(returnResult);
        } else {
            return returnResult(result);
        }
    }).then(function(deploymentConfig) {
        if (config.programOptions.verbose) {
            console.log('Generating cloudformation template...');
        }

        if (deploymentConfig.buildResult.resources && !(deploymentConfig.buildResult.resources instanceof Array)) {
            throw new Error('component resources must be array');
        }

        if (deploymentConfig.buildResult.outputs && !(deploymentConfig.buildResult.outputs instanceof Array)) {
            throw new Error('component outputs must be array');
        }

        if (deploymentConfig.buildResult.parameters && !(deploymentConfig.buildResult.parameters instanceof Array)) {
            throw new Error('component parameters must be array');
        }

        var stack = novaform.Stack(deploymentConfig.stackName);

        var resources = _.reduce(deploymentConfig.buildResult.resources, function(memo, res) {
            // console.log(res instanceof novastl.Template);
            if (res instanceof novastl.Template) {
                return memo.concat(res.resources());
            }
            return memo.concat(res);
        }, []);

        stack.add(resources);
        stack.add(deploymentConfig.buildResult.outputs || []);
        stack.add(_.pluck(deploymentConfig.buildResult.parameters, 'param'));

        if (stack.isEmpty()) {
            throw new Error('Nothing to deploy. Lets call it a success!');
        }

        var templateBody = stack.toJson();

        var templateOutput = that.commandOptions['template-output'];
        if (templateOutput === '-') {
            console.log(templateBody);
        } else if (templateOutput) {
            var fd = fs.openSync(templateOutput, 'w');
            fs.writeSync(fd, templateBody);
            fs.closeSync(fd);
        }

        return _.extend(deploymentConfig, {
            templateBody: templateBody,
        });
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        if (config.programOptions.verbose) {
            console.log('Uploading cloudformation template to S3...');
        }

        var s3config = config.get('s3');
        var bucketName = s3config.bucket;
        var region = s3config.region;
        var dateString = deploymentConfig.deploymentDate.format();
        var keyPath = util.format('%s%s/%s/%s/templates/%s-%s.json',
            s3config.keyPrefix,
            that.ref.project, that.ref.component,
            deploymentConfig.deploymentId,
            deploymentConfig.stackName, dateString);

        var params = {
            Bucket: bucketName,
            Key: keyPath,
            Body: deploymentConfig.templateBody,
        };

        var s3 = new AWS.S3({ region : region });
        var s3upload = q.nbind(s3.upload, s3);
        return s3upload(params).then(function() {
            var url = s3utils.urlForUploadParams(s3config.region, params);
            return _.extend(deploymentConfig, {
                templateUrl: url,
            });
        }).catch(function(e) {
            throw new Error(util.format('Failed to upload to S3: %s', JSON.stringify(e)));
        });
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        if (config.programOptions.verbose) {
            console.log('Checking cloudformation stack status...');
        }

        var cfn = that.cfn;
        var getStackStatus = q.nbind(Stack.getStackStatus, Stack);
        return getStackStatus(cfn, deploymentConfig.stackName).then(function(status) {
            if (status !== Stack.Status.ROLLBACK_COMPLETE) {
                // all good, nothing to do here.
                return _.assign(deploymentConfig, {
                    stackStatus: status
                });
            }

            if (config.programOptions.verbose) {
                console.log('Stack was stuck in a rollback state, deleting it before deploying...');
            }

            // oh, previous stack creation failed and we cannot update failed stack
            // the only option is to delete the stack and create it again.
            var deleteStack = q.nbind(cfn.deleteStack, cfn);
            return deleteStack({
                StackName: deploymentConfig.stackName
            }).then(function(data) {
                return that._waitForStack({
                    cfn: cfn,
                    stackName: deploymentConfig.stackName,
                }, function(status) {
                    if (status === Stack.Status.DOES_NOT_EXIST) {
                        return _.assign(deploymentConfig, {
                            stackStatus: status
                        });
                    }
                    console.log('Still waiting...');
                    return null;
                });
            }).catch(function(err) {
                throw new Error(util.format('Failed to delete stack "%s": %j', deploymentConfig.stackName, err));
            });
        });
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        if (config.programOptions.verbose) {
            console.log('Deploying cloudformation stack...');
        }

        var parameters = _.map(deploymentConfig.buildResult.parameters, function(paramObject){
            if (paramObject.value === null || typeof paramObject.value === 'undefined') {
                throw new Error('Parameter values for \'' + paramObject.param.name
                    + '\' cannot be null');
            }
            return {
                ParameterKey: paramObject.param.name,
                ParameterValue: paramObject.value
            }
        });

        var cfn = that.cfn;
        if (deploymentConfig.stackStatus === Stack.Status.DOES_NOT_EXIST) {
            // create a new stack
            var createStack = q.nbind(cfn.createStack, cfn);
            return createStack({
                Capabilities: [ 'CAPABILITY_IAM' ], // TODO: this is only needed for some stacks that create iam roles, hm.
                StackName: deploymentConfig.stackName,
                TemplateURL: deploymentConfig.templateUrl,
                Tags: [
                    { Key: 'nova-project', Value: deploymentConfig.projectName },
                    { Key: 'nova-component', Value: deploymentConfig.componentName },
                ],
                Parameters: parameters
            }).then(function(data) {
                return _.extend(deploymentConfig, {
                    stackId: data.StackId,
                });
            }).catch(function(err) {
                throw new Error(util.format('Failed to initiate stack creation:\n%j', err));
            });
        } else {
            if (!Stack.isStatusComplete(deploymentConfig.stackStatus)) {
                // already in progress?
                throw new Error(util.format('Stack is not in a valid state for deployment (%s)', deploymentConfig.stackStatus));
            }

            // update an existing stack
            var updateStack = q.nbind(cfn.updateStack, cfn);
            return updateStack({
                Capabilities: [ 'CAPABILITY_IAM' ], // TODO: this is only needed for some stacks that create iam roles, hm.
                StackName: deploymentConfig.stackName,
                TemplateURL: deploymentConfig.templateUrl,
                Parameters: parameters,
            }).then(function(data) {
                return _.extend(deploymentConfig, {
                    stackId: data.StackId,
                });
            }).catch(function(err) {
                throw new Error(util.format('Failed to initiate stack creation:\n%j', err));
            });
        }
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        // wait for completion
        if (that.commandOptions.wait) {
            if (config.programOptions.verbose) {
                console.log('Waiting for deployment to complete...');
            }

            return that._waitForStack({
                cfn: deploymentConfig.cfn,
                stackName: deploymentConfig.stackName,
            }, function(status) {
                if (Stack.isStatusFailed(status)
                    || Stack.isStatusRolledBack(status)
                    || Stack.isStatusRollingback(status)) {
                    throw new Error('Stack deployment failed');
                }
                if (!Stack.isStatusComplete(status)) {
                    if (config.programOptions.verbose) {
                        console.log('Still waiting...');
                    }
                    return null;
                }
                return deploymentConfig;
            });
        }
        return deploymentConfig;
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        var getStackOutput = q.nbind(Stack.getStackOutput, Stack);
        return getStackOutput(deploymentConfig.cfn, deploymentConfig.stackName).then(function(outputs) {
            return _.extend(deploymentConfig, {
                stackOutput: outputs,
            });
        });
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        var output = {
            project: deploymentConfig.projectName,
            component: deploymentConfig.componentName,
            deploymentId: deploymentConfig.deploymentId,
            stackId: deploymentConfig.stackId,
        };

        var stackOutput = deploymentConfig.stackOutput;

        if (config.programOptions['output-format'] == 'json') {
            console.log(_.extend({}, output, stackOutput));
        } else if (config.programOptions['output-format'] == 'text') {
            function print(x) {
                for (var key in x) {
                    var value = x[key];
                    console.log(util.format('\t%s: %s', key, value));
                }
            }

            console.log('\nOutput:\n')
            print(output);
            print(stackOutput);
        }
    }).catch(function(e) {
        // TODO: differentiate between internal errors and valid exits like timeout or stack deployment failed
        if (e instanceof Error) {
            console.error(util.format('Internal error: %s', e.stack));
        } else {
            console.error(util.format('Internal error: %s', e));
        }
    }).done();
}

module.exports = Command;
