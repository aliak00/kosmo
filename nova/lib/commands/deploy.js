var getopt = require('node-getopt')
    , q = require('q')
    , _ = require('underscore')
    , util = require('util')
    , fs = require('fs')
    , novaform = require('novaform')
    , novastl = require('novastl')
    , AWS = require('aws-sdk');

var cmdopts = module.exports.opts = getopt.create([
    ['w', 'wait', 'Wait for completion'],
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

Command.prototype.execute = function() {
    var that = this;
    return q().then(function() {
        // TODO: validate project's components, make sure dependencies exist
    }).then(function() {
        // TODO: fetch output for each dependant component
    }).then(function() {
        // TODO: inject dependencies into the component
        var dependencies = {
            // infrastructure: { vpc: 'vpc-123' }
        };

        return dependencies;
    }).then(function(dependencies) {
        // build cloudformation resources
        if (that.commonOptions.verbose) {
            console.log('Generating cloudformation template...');
        }
        var stackName = that.ref.makeStackName();
        var result = that.component.build(dependencies);
        var stack = novaform.Stack(stackName);
        stack.add(result.resourceGroups);
        stack.add(result.outputs);

        var templateBody = stack.toJson();
        return [stackName,templateBody];
    }).spread(function(stackName, templateBody) {
        if (that.commonOptions.verbose) {
            console.log('Uploading cloudformation template to S3...');
        }

        var bucketname = that.config.s3.bucket;
        var region = that.config.s3.region;
        var keypath = util.format('%s%s', that.config.s3.keyPrefix, stackName);

        var params = {
            Bucket: bucketname,
            Key: keypath,
            Body: templateBody
        };

        function s3_endpoint(region) {
            if (!region) {
                return 'https://s3.amazonaws.com';
            }
            return util.format('https://s3-%s.amazonaws.com', region);
        }

        var s3 = new AWS.S3({ region : region });
        var s3upload = q.nbind(s3.upload, s3);
        return s3upload(params).then(function() {
            var s3endpoint = s3_endpoint(that.config.s3.region);
            var url = util.format('%s/%s/%s', s3endpoint, bucketname, keypath);
            return url;
        }).catch(function(e) {
            throw new Error(util.format('Failed to upload to S3: %s', JSON.stringify(e)));
        });
    }).then(function(templateUrl) {
        if (that.commonOptions.verbose) {
            console.log('Deploying cloudformation stack...');
        }
        // TODO: initiate cloudformation deployment
    }).then(function() {
        // TODO: wait for completion
        // if (that.opts.wait) {
        // }
    }).then(function() {
        // TODO: fetch stack output and print it
    }).catch(function(e) {
        console.error(util.format('Internal error: %s', e.message));
    });
}

Command.usageText = '[options] <project>/<component>'
Command.descriptionText = 'Deploys project component';
Command.optionsText = cmdopts.getHelp();

module.exports = Command;

// helpers
// TODO: this should probably be shared in lib/shared ?

function Ref(project, component) {
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
    // TODO: make camel case and validate limits
    return this.project + this.component;
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
                var config = module(novaform, novastl);
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
