var _ = require('underscore')
    , q = require('q')
    , AWS = require('aws-sdk')
    , archiver = require('archiver')
    , util = require('util')
    , path = require('path')
    , fs = require('fs')
    , config = require('./configuration')
    , s3utils = require('./s3utils')
    , minimatch = require('minimatch')
    , assert = require('assert');

module.exports.createArchive = function(destinationName, sourcePath, options, callback) {
    var deferred;

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (typeof callback !== 'function') {
        callback = function() {};
        deferred = q.defer();
    }

    if (!path.extname(destinationName)) {
        destinationName += '.zip';
    }

    if (config.commonOptions.verbose) {
        console.log('Creating artifact archive...');
    }

    var tempdir = '/tmp/';
    var destinationPath = path.join(tempdir, destinationName);

    if (destinationPath.indexOf(tempdir) !== 0) {
        throw new Error('createArchive: destinationName should not try to exit its sandbox');
    }

    var output = fs.createWriteStream(destinationPath);
    var archive = archiver('zip');

    output.on('close', function() {
        if (config.commonOptions.verbose) {
            var size = archive.pointer();
            var sizeString;
            if (size >= 1024*1024) {
                sizeString = util.format('%dMB', Math.round(size/1024/1024));
            } else if (size >= 1024) {
                sizeString = util.format('%dKB', Math.round(size/1024));
            } else {
                sizeString = util.format('%dbytes', size);
            }
            console.log(util.format('Done. Made %s of size %s', destinationName, sizeString));
        }
        callback(null, destinationPath);
        deferred && deferred.resolve(destinationPath);
    });

    archive.on('error', function(err) {
        callback(err);
        deferred && deferred.reject(err);
    });

    archive.pipe(output);

    if (options.filter) {
        readdir = q.nbind(fs.readdir, fs);
        stat = q.nbind(fs.stat, fs);

        var walk = function(directoryPath) {
            return readdir(directoryPath).then(function(files) {
                files = _.map(files, function(file) {
                    return path.join(directoryPath, file);
                });
                var statPromises = _.map(files, function(file) {
                    return stat(file);
                });
                return q.all(statPromises).then(function(stats) {
                    return _.zip(files, stats);
                }).then(function(data) {
                    var entries = _.filter(data, function(e) {
                        var file = e[0];
                        var stats = e[1];
                        return options.filter(file, stats);
                    });

                    var result = _.reduce(entries, function(memo, e) {
                        var filepath = e[0];
                        var stats = e[1];
                        return {
                            files: memo.files.concat( stats.isFile() ? [ { path: filepath, stats: stats } ] : [] ),
                            directories: memo.directories.concat( stats.isDirectory() ? [ { path: filepath, stats: stats } ] : [] ),
                        };
                    }, { files: [], directories: [] });

                    _.each(result.files, function(fi) {
                        assert(fi.path.indexOf(sourcePath) === 0);
                        var storedPath = fi.path.slice(sourcePath.length);
                        archive.file(fi.path, {
                            name: storedPath,
                            stats: fi.stats,
                        });
                    });

                    var promises = _.map(result.directories, function(fi) {
                        return walk(fi.path);
                    });
                    return q.all(promises);
                });
            });
        };
        walk(sourcePath).then(function() {
            archive.finalize();
        }).done();
    } else {
        archive
            .directory(sourcePath, false)
            .finalize();
    }
    return deferred ? deferred.promise : undefined;
};

module.exports.deployArchive = function(sourcePath, options, callback) {
    options = options || {};

    var deferred;
    if (typeof callback !== 'function') {
        deferred = q.defer();
    }

    function resolve(result) {
        typeof callback === 'function' && callback(null, result);
        deferred && deferred.resolve(result);
    }
    function reject(err) {
        typeof callback === 'function' && callback(err);
        deferred && deferred.reject(err);
    }

    if (!options.region) {
        reject(new Error('deployArchive: region was not specified in options'));
        return deferred;
    }

    var s3 = new AWS.S3({ region : options.region });
    var s3config = config.get('s3');
    var artifactsBucket = util.format('%s-artifacts-%s', s3config.bucket, options.region);

    q().then(function() {
        if (config.commonOptions.verbose) {
            console.log(util.format('Verifying the target S3 bucket for artifacts exists in %s region...', options.region));
        }
        var getBucketLocation = q.nbind(s3.getBucketLocation, s3);
        return getBucketLocation({ Bucket : artifactsBucket }).catch(function(err) {
            if (err.code === 'NoSuchBucket') {
                return null;
            }
            throw new Error(util.format('deployArchive: Unknown error: %s: %s', err.code, err.message));
        });
    }).then(function(data) {
        if (!data) {
            if (config.commonOptions.verbose) {
                console.log(util.format('Nope. Creating bucket %s...', artifactsBucket));
            }
            var createBucket = q.nbind(s3.createBucket, s3);
            var params = {
                Bucket: artifactsBucket,
                ACL: 'private',
                CreateBucketConfiguration: {
                    LocationConstraint: options.region,
                },
            };
            return createBucket(params).catch(function(err) {
                var errmsg = util.format('deployArchive: failed to create artifacts bucket in the specified region %s: %s',
                    options.region, err.message);
                throw new Error(errmsg);
            });
        } else {
            var location = data.LocationConstraint;
            if (location !== options.region) {
                var errmsg = util.format('deployArchive: something is wrong, bucket "%s" should be in "%s" region but in fact is in "%s"',
                    artifactsBucket, options.region, location);
                throw new Error(errmsg);
            }
        }
    }).then(function() {
        if (config.commonOptions.verbose) {
            console.log('Uploading artifact...');
        }
        var sourceStream = fs.createReadStream(sourcePath);

        var destinationKeyName = path.basename(sourcePath);

        var deploymentDateString = config.currentDeployment.date.format();
        var deploymentId = config.currentDeployment.id;
        var keypath = util.format('%s%s/%s/%s/artifacts/%s',
            s3config.keyPrefix,
            config.currentDeployment.ref.project,
            config.currentDeployment.ref.component,
            deploymentId,
            destinationKeyName);

        var params = {
            Bucket: artifactsBucket,
            Key: keypath,
            Body: sourceStream,
        };
        var upload = q.nbind(s3.upload, s3);
        return upload(params).then(function() {
            return params;
        }).catch(function(err) {
            reject(err);
        });
    }).then(function(params) {
        var url = s3utils.urlForUploadParams(options.region, params);
        var result = {
            bucket: params.Bucket,
            key: params.Key,
            url: url,
        };
        resolve(result);
    }).catch(function(err) {
        reject(err);
    });

    return deferred ? deferred.promise : undefined;
};

module.exports.findArtifacts = function(options, callback) {
    //TODO: options is ignored for now
    if (typeof options === 'function') {
        options = null;
        callback = options;
    }

    var deferred = typeof callback === 'function' ? undefined : q.defer();
    function resolve(result) {
        typeof callback === 'function' && callback(null, result);
        deferred && deferred.resolve(result);
    }
    function reject(err) {
        typeof callback === 'function' && callback(err);
        deferred && deferred.reject(err);
    }

    // get the region for the component that is currently being deployed.
    // e.g. Elastic Beanstalk expects artifacts in the same region as the EB app.
    var region = config.currentDeployment.region;

    q().then(function() {
        return {
            region: region,
        };
    }).then(function(state) {
        var s3 = new AWS.S3({ region : region });
        var s3listObjects = q.nbind(s3.listObjects, s3);

        var s3config = config.get('s3', config.commonOptions.profile);
        var bucketname = util.format('%s-artifacts-%s', s3config.bucket, region);

        var params = {
            Bucket: bucketname,
            Prefix: util.format('%s%s/', s3config.keyPrefix, config.currentDeployment.ref.project),
        };

        return s3listObjects(params).then(function(data) {
            if (data.IsTruncated) {
                throw new Error('Internal error: truncated list object requests are not implemented');
            }
            var key = _.last(data.Contents).Key;
            key = key.substr(params.Prefix.length);
            var timestamp = key.split('/')[0];
            return _.extend(state, {
                timestamp: timestamp,
                bucket: bucketname,
            });
        }).then(function(state) {
            var params = {
                Bucket: bucketname,
                Prefix: util.format('%s%s/%s/artifacts/',
                    s3config.keyPrefix,
                    config.currentDeployment.ref.project,
                    state.timestamp),
            };

            return s3listObjects(params).then(function(data) {
                if (data.IsTruncated) {
                    throw new Error('Internal error: truncated list object requests are not implemented');
                }
                var keys = _.map(data.Contents, function(elem) {
                    return elem.Key;
                });
                return _.extend(state, {
                    keys: keys,
                });
            });
        }).then(function(state) {
            var artifacts = _.map(state.keys, function(key) {
                return {
                    timestamp: state.timestamp,
                    bucket: state.bucket,
                    key: key,
                };
            });
            if (config.commonOptions.verbose) {
                var names = _.map(state.keys, function(key) {
                    return path.basename(key);
                });
                console.log(util.format('Found artifact(s) %s: %s', state.timestamp, names.join(', ')));
            }
            resolve(artifacts);
        });
    }).catch(function(err) {
        reject(err);
    }).done();

    return deferred ? deferred.promise : undefined;
};

module.exports.excludesFilter = function(excludes) {
    var matchers = _.map(excludes, function(excludePattern) {
        return minimatch.filter(excludePattern, { matchBase: true });
    });
    var any = function(filepath) {
        return _.any(matchers, function(matcher) {
            return matcher(filepath);
        });
    };

    return function(filepath, stats) {
        return !any(filepath);
    };
};
