var getopt = require('node-getopt')
    , q = require('q')
    , _ = require('lodash')
    , util = require('util')
    , fs = require('fs')
    , path = require('path')
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
    , assert = require('assert');

function Command(opts, config) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.opts = opts;
    this.commandOptions = this.opts.options;

    if (_(opts.argv).isEmpty()) {
        throw new Error('Missing project reference');
    } else if (opts.argv.length !== 1) {
        throw new Error('Too many project references specified');
    }

    var projectName = this.projectName = opts.argv[0];
    this.project = Project.load(projectName, config.paramsObject, function(e) {
        throw new Error(util.format('Failed to load project "%s": %s', projectName, e.message));
    });

    if (!this.project) {
        throw new Error(util.format('Could not find project "%s"', projectName));
    }

    var self = this;
    if (this.commandOptions.artifact && this.commandOptions.region && this.commandOptions.name) {
        this.project.config.artifacts = [{
            name: this.commandOptions.name,
            region: this.commandOptions.region,
            build: function() {
                return self.commandOptions.artifact;
            }
        }];

        this.willSkipBuildStep = true;
    } else if (this.commandOptions.artifact || this.commandOptions.region || this.commandOptions.name) {
        throw new Error('If you specify any of --artifact, --name or --region, you must specify them all');
    }
}

Command.options = [
    ['', 'artifact=ARG', 'Will upload and use specified artifact'],
    ['', 'name=ARG', 'The name to use for the artifact'],
    ['', 'region=ARG', 'The region the artifact belongs to'],
];
Command.usageText = '[options] project_name'
Command.descriptionText = 'Builds artifacts for the project';

Command.prototype.execute = function() {
    var that = this;

    return q().then(function() {
        var buildDate = moment.utc();

        config.currentBuild.date = buildDate;
        config.currentBuild.project = that.projectName;

        return {
            projectName: that.projectName,
            buildDate: buildDate,
        };
    }).then(function(buildConfig) {
        if (config.programOptions.verbose) {
            console.log('Ensuring buckets are full...');
        }
        var regions = _.compact(_.uniq(_.map(that.project.config.artifacts, function(artifact) {
            if (typeof artifact.region === 'string') {
                return [artifact.region];
            }
            return artifact.region;
        })));

        // ensure there are buckets in right regions to upload artifacts to
        var s3config = config.get('s3');
        var bucketNameBase = s3config.bucket;

        var buckets = _.uniq(_.flatten(_.map(regions, function(regionArray) {
            return _.map(regionArray, function(region) {
                return {
                    name: util.format('%s-artifacts-%s', bucketNameBase, region),
                    region: region,
                };
            });
        })));

        var s3 = new AWS.S3({ region: s3config.region, signatureVersion: 'v4' });

        var promises = _.map(buckets, function(bucket) {
            var getBucketLocation = q.nbind(s3.getBucketLocation, s3);
            return getBucketLocation({ Bucket : bucket.name }).then(function(data) {
                return {
                    bucketName: bucket.name,
                    expected: bucket.region,
                    actual: data.LocationConstraint,
                };
            }).catch(function(err) {
                if (err.code === 'NoSuchBucket') {
                    return {
                        bucketName: bucket.name,
                        expected: bucket.region,
                        actual: null,
                    };
                }
                throw err;
            });
        });

        return q.all(promises).then(function(results) {
            var failures = _.filter(results, function(result) {
                return result.expected !== result.actual;
            });
            if (failures.length) {
                var errmsg = _.map(failures, function(result) {
                    if (result.actual) {
                        return util.format('%s: Expected %s, Actual %s', result.bucketName, result.expected, result.actual);
                    } else {
                        return util.format('%s does not exist', result.bucketName);
                    }
                }).join('\n');
                var msg = 'Internal error: some buckets are not configured to correct regions:\n' + errmsg;
                throw new Error(msg);
            }

            return buildConfig;
        });
    }).then(function(buildConfig) {
        if (config.programOptions.verbose) {
            if (!that.willSkipBuildStep) {
                console.log('Building artifacts...');
            } else {
                console.log('Artifact explicity specified. Skipping build artifact step');
            }
        }

        var promises = _.map(that.project.config.artifacts, function(artifact) {
            var doneDeferred = q.defer();

            function returnResultMaker(artifact) {
                return function(result) {
                    return {
                        name: artifact.name,
                        region: artifact.region,
                        path: result,
                    };
                };
            }

            var returnResult = returnResultMaker(artifact);

            var options = {}; // Currently unused but reserved for the future use.
            var result = artifact.build(options, doneDeferred.makeNodeResolver());
            if (typeof result === 'undefined') {
                // looks like component wants to use async building, lets wait for done callback to be called.
                return doneDeferred.promise.then(returnResult);
            } else if (q.isPromiseAlike(result)) {
                // async building with promises. Assume build() returned a promise
                return result.then(returnResult);
            } else {
                return returnResult(result);
            }
        });
        return q.all(promises).then(function(results) {
            return _.extend(buildConfig, {
                artifacts: results,
            });
        });
    }).then(function(buildConfig) {
        if (config.programOptions.verbose) {
            console.log('Uploading artifacts...');
        }

        var s3config = config.get('s3');
        var dateString = buildConfig.buildDate.format('YYYYMMDDTHHmmss');

        var keyPathBase = util.format('%s%s/%s/artifacts',
            s3config.keyPrefix,
            buildConfig.projectName,
            dateString);

        var uploadInfo = _.reduce(buildConfig.artifacts, function(memo, artifact) {
            if (!artifact.path) {
                return memo;
            }
            var baseName = path.basename(artifact.path);
            var regions = typeof artifact.region === 'string' ? [artifact.region] : artifact.region;
            memo = memo.concat(_.map(_.uniq(regions), function(region) {
                return {
                    bucketName: util.format('%s-artifacts-%s', s3config.bucket, region),
                    bucketRegion: region,
                    bucketKeyPath: keyPathBase + '/' + baseName,
                    artifactReadStream: fs.createReadStream(artifact.path),
                    artifactName: artifact.name,
                };
            }));
            return memo;
        }, []);

        var promises = _.map(uploadInfo, function(info) {
            var params = {
                Bucket: info.bucketName,
                Key: info.bucketKeyPath,
                Body: info.artifactReadStream,
            };

            var s3 = new AWS.S3({ region : info.bucketRegion, signatureVersion: 'v4' });

            var lastProgress = 0;
            var s3ManagedUploader = s3.upload(params);
            if (config.programOptions.verbose) {
                s3ManagedUploader.on('httpUploadProgress', function(event) {
                    var thisProgress = event.loaded / event.total * 100;
                    if (thisProgress === 100 || thisProgress > lastProgress + 7) {
                        console.log('Progress (', info.bucketRegion, ')', thisProgress.toFixed(1), '% -', event.loaded, 'of', event.total);
                        lastProgress = thisProgress;
                    }
                });
            }

            var s3ManagedUploaderSend = q.nbind(s3ManagedUploader.send, s3ManagedUploader);
            return s3ManagedUploaderSend().then(function(data) {
                return {
                    Bucket: info.bucketName,
                    Key: info.bucketKeyPath,
                    region: info.bucketRegion,
                    url: data.Location,
                    name: info.artifactName,
                };
            });
        });

        return q.all(_.compact(promises)).then(function(results) {
            return _.extend(buildConfig, {
                artifacts: results,
            });
        }).catch(function(e) {
            throw new Error(util.format('Failed to upload to S3: %s', e.stack));
        });
    }).then(function(buildConfig) {
        _.each(buildConfig.artifacts, function(artifact) {
            console.log('Created "%s" artifact: %s', artifact.name, artifact.url);
        });
    }).catch(function(e) {
        // TODO: differentiate between internal errors and valid exits like timeout or stack deployment failed
        console.error(util.format('Internal error: %s', e.stack));
        console.log(e)
    }).done();
}

module.exports = Command;
