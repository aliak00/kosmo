var getopt = require('node-getopt')
    , q = require('q')
    , _ = require('underscore')
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
    , assert = require('assert');

var cmdopts = module.exports.opts = getopt.create([
    ['w', 'wait', 'Wait for completion'],
    ['n', 'noop', 'Do not actually deploy'],
    ['', 'template-output=ARG', 'Dump the generated CloudFormation template to a file'],
    ['h', 'help', 'Display help']
]);

cmdopts.setHelp('[[OPTIONS]]\n');

function Command(config, commonOptions, args, helpCallback) {
    if (!(this instanceof Command)) {
        return new Command(name, properties);
    }

    this.config = config;
    this.displayHelpAndExit = helpCallback;

    var opts = this.opts = cmdopts.parse(args);
    this.commonOptions = commonOptions;
    this.commandOptions = this.opts.options;

    if (opts.options.help) {
        helpCallback();
        return;
    }

    if (_(opts.argv).isEmpty()) {
        helpCallback('Missing project/component reference');
        return;
    } else if (opts.argv.length !== 1) {
        helpCallback('Too many project/component references specified');
        return;
    }

    var ref = opts.argv[0];
    ref = this.ref = Ref.parse(ref);
    if (!this.ref) {
        helpCallback('Invalid project ref');
        return;
    }
    if (!this.ref.component) {
        helpCallback('Component was not specified')
        return;
    }

    this.project = Project.load(this.ref.project, function(e) {
        helpCallback(util.format('Failed to load project "%s": %s', ref.project, e.message));
    });
    if (!this.project) {
        helpCallback(util.format('Could not find project "%s"', this.ref.project));
        return;
    }

    this.component = this.project.findComponent(this.ref.component);
    if (!this.component) {
        helpCallback(util.format('Component "%s" does not exist', this.ref.component));
        return;
    }
}

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

        return {
            projectName: that.ref.project,
            componentName: that.ref.component,
            deploymentDate: deploymentDate,
            deploymentId: deploymentId,
            stackName: stackName,
        };
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
            var deps = component.dependencies.map(function(depname) {
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
        // fetch output for each dependent component

        var getStackOutput = q.nbind(Stack.getStackOutput, Stack);
        if (that.commonOptions.verbose) {
            console.log('Fetching outputs of dependent stacks...');
        }

        var region = that.component.region;
        var cfn = that.cfn = new AWS.CloudFormation({ region : region });

        var componentNames = deploymentConfig.dependentComponents;

        var outputsPromises = componentNames.map(function(depname) {
            return Ref(that.ref.project, depname).makeStackName();
        }).map(function(stackName) {
            return getStackOutput(cfn, stackName);
        });

        return q.all(outputsPromises).then(function(results) {
            var dependencyObject = _.object(_.zip(componentNames, results));
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
        // build the component
        if (that.commonOptions.verbose) {
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
            return doneDeferred.promise.timeout(30000).then(returnResult);
        } else if (_.has(result, 'then') && typeof result.then === 'function') {
            // async building with promises. Assume build() returned a promise
            return result.then(returnResult);
        } else {
            return returnResult(result);
        }
    }).then(function(deploymentConfig) {
        // build cloudformation resources
        if (that.commonOptions.verbose) {
            console.log('Generating cloudformation template...');
        }

        var stack = novaform.Stack(deploymentConfig.stackName);
        stack.add(deploymentConfig.buildResult.resources || []);
        stack.add(deploymentConfig.buildResult.outputs || []);

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

        if (that.commonOptions.verbose) {
            console.log('Uploading cloudformation template to S3...');
        }

        var bucketname = that.config.s3.bucket;
        var region = that.config.s3.region;
        var datestring = deploymentConfig.deploymentDate.format();
        var keypath = util.format('%s%s/%s/%s/templates/%s-%s.json',
            that.config.s3.keyPrefix,
            that.ref.project, that.ref.component,
            deploymentConfig.deploymentId,
            deploymentConfig.stackName, datestring);

        var params = {
            Bucket: bucketname,
            Key: keypath,
            Body: deploymentConfig.templateBody,
        };

        var s3 = new AWS.S3({ region : region });
        var s3upload = q.nbind(s3.upload, s3);
        return s3upload(params).then(function() {
            var url = s3utils.urlForUploadParams(that.config.s3.region, params);
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

        // initiate cloudformation deployment
        var cfn = that.cfn;
        var getStackStatus = q.nbind(Stack.getStackStatus, Stack);
        if (that.commonOptions.verbose) {
            console.log('Checking cloudformation stack status...');
        }
        return getStackStatus(cfn, deploymentConfig.stackName).then(function(status) {
            if (status !== Stack.Status.ROLLBACK_COMPLETE) {
                // all good, nothing to do here.
                return status;
            }

            if (that.commonOptions.verbose) {
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
                        return status;
                    }
                    console.log('Still waiting...');
                    return null;
                });
            }).catch(function(err) {
                throw new Error(util.format('Failed to delete stack "%s": %j', deploymentConfig.stackName, err));
            });
        }).then(function(status) {
            if (that.commonOptions.verbose) {
                console.log('Deploying cloudformation stack...');
            }
            if (status === Stack.Status.DOES_NOT_EXIST) {
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
                }).then(function(data) {
                    return _.extend(deploymentConfig, {
                        cfn: cfn,
                        stackId: data.StackId,
                    });
                }).catch(function(err) {
                    throw new Error(util.format('Failed to initiate stack creation:\n%j', err));
                });
            } else {
                if (!Stack.isStatusComplete(status)) {
                    // already in progress?
                    throw new Error(util.format('Stack is not in a valid state for deployment (%s)', status));
                }

                // update an existing stack
                var updateStack = q.nbind(cfn.updateStack, cfn);
                return updateStack({
                    Capabilities: [ 'CAPABILITY_IAM' ], // TODO: this is only needed for some stacks that create iam roles, hm.
                    StackName: deploymentConfig.stackName,
                    TemplateURL: deploymentConfig.templateUrl,
                }).then(function(data) {
                    return _.extend(deploymentConfig, {
                        cfn: cfn,
                        stackId: data.StackId,
                    });
                }).catch(function(err) {
                    throw new Error(util.format('Failed to initiate stack creation:\n%j', err));
                });
            }
        });
    }).then(function(deploymentConfig) {
        if (that.commandOptions.noop) {
            return deploymentConfig;
        }

        // wait for completion
        if (that.commandOptions.wait) {
            if (that.commonOptions.verbose) {
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
                    if (that.commonOptions.verbose) {
                        console.log('Still waiting...');
                    }
                    return null;
                }
                return deploymentConfig;
            });
        }
        return deploymentConfig;
    }).then(function(deploymentConfig) {
        var getStackOutput = q.nbind(Stack.getStackOutput, Stack);
        return getStackOutput(deploymentConfig.cfn, deploymentConfig.stackName).then(function(outputs) {
            return _.extend(deploymentConfig, {
                stackOutput: outputs,
            });
        });
    }).then(function(deploymentConfig) {
        var output = {
            project: deploymentConfig.projectName,
            component: deploymentConfig.componentName,
            deploymentId: deploymentConfig.deploymentId,
            stackId: deploymentConfig.stackId,
        };

        var stackOutput = deploymentConfig.stackOutput;

        if (that.commonOptions['output-format'] == 'json') {
            console.log(_.extend({}, output, stackOutput));
        } else if (that.commonOptions['output-format'] == 'text') {
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
        console.error(util.format('Internal error: %s', e.stack));
        console.log(e);
    });
}

Command.usageText = '[options] <project>/<component>'
Command.descriptionText = 'Deploys project component';
Command.optionsText = cmdopts.getHelp();

module.exports = Command;

// helpers
// TODO: this should probably be shared in lib/shared ?

function Ref(project, component) {
    if (!(this instanceof Ref)) {
        return new Ref(project, component);
    }

    this.project = project;
    this.component = component;
}

Ref.parse = function(ref) {
    var project;
    var component;

    if (typeof ref !== 'string') {
        return undefined;
    }
    var l = ref.split('/');
    if (l.length > 2) {
        return undefined;
    }
    project = l[0];
    component = l[1];

    return new Ref(project, component);
}

Ref.prototype.makeStackName = function() {
    assert(this.project);
    assert(this.component);

    var project = this.project[0].toUpperCase() + this.project.substr(1).toLowerCase();
    var component = this.component[0].toUpperCase() + this.component.substr(1).toLowerCase();

    return project + component;
};

function Project(config) {
    this.config = config;
}
Project.searchPaths = [process.cwd()];
Project.load = function(name, callback) {
    for (var i = 0; i < Project.searchPaths.length; ++i) {
        var searchPath = Project.searchPaths[i];
        var filepath = searchPath + '/' + name;

        if (fs.existsSync(filepath) || fs.existsSync(filepath + '.js')) {
            try {
                var module = require(filepath);
                var config = module({
                    utils: novautils,
                    resources: novaform,
                    templates: novastl,
                });
                return new Project(config);
            } catch (e) {
                if (callback) {
                    callback(e);
                }
            }
            return null;
        }
    }
    return null;
};
Project.prototype.findComponent = function(name) {
    var component = _.findWhere(this.config.components, { name : name })
    return component;
}
