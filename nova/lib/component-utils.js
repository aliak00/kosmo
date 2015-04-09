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

function walkFiles(directoryPath, callback, filter) {
    var readdir = q.nbind(fs.readdir, fs);
    var stat = q.nbind(fs.stat, fs);
    return readdir(directoryPath).then(function(files) {
        var info = _.reduce(files, function(memo, file) {
            file = path.join(directoryPath, file);
            return {
                files: memo.files.concat([file]),
                statPromises: memo.statPromises.concat([stat(file)])
            }
        }, { files: [], statPromises: [] });
        return q.all(info.statPromises).then(function(stats) {
            return _.object(info.files, stats);
        }).then(function(entries) {
            if (filter) {
                entries = _.omit(entries, function(stats, file) {
                    return !filter(file, stats)
                });
            }
            var result = _.reduce(entries, function(memo, stats, file) {
                return {
                    files: memo.files.concat( stats.isFile() ? [ { path: file, stats: stats } ] : [] ),
                    directories: memo.directories.concat( stats.isDirectory() ? [ { path: file, stats: stats } ] : [] ),
                };
            }, { files: [], directories: [] });
            _.each(result.files, function(fi) {
                callback(fi.path, fi.stats);
            });
            var promises = _.map(result.directories, function(fi) {
                return walkFiles(fi.path, callback, filter);
            });
            return q.all(promises);
        });
    });
};

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

    if (config.commonOptions.verbose) {
        console.log('Creating archive', destinationName);
    }

    if (!path.extname(destinationName)) {
        destinationName += '.zip';
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

    var allTheFiles = [];
    walkFiles(sourcePath, function(file, stats) {
        assert(sourcePath === '.' || file.indexOf(sourcePath) === 0);
        allTheFiles.push({
            file: file,
            stats: stats
        });
    }, options.filter).then(function() {
        if (config.commonOptions.verbose) {
            var entriesAdded = 0;
            var lastProgress = 0;
            archive.on('entry', function(entry) {
                entriesAdded++;
                var thisProgress = entriesAdded / allTheFiles.length * 100;
                if (thisProgress === 100 || thisProgress > lastProgress + 7) {
                    console.log('Progress', thisProgress.toFixed(1), '% -', entriesAdded, 'of', allTheFiles.length, 'files added');
                    lastProgress = thisProgress;
                }
            });
        }

        allTheFiles.forEach(function(fi) {
            var storedPath = fi.file.slice(sourcePath.length);
            archive.file(fi.file, {
                name: storedPath,
                stats: fi.stats,
            });
        })

        archive.finalize();
    }).done();

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
        var keyPath = util.format('%s%s/%s/%s/artifacts/%s',
            s3config.keyPrefix,
            config.currentDeployment.ref.project,
            config.currentDeployment.ref.component,
            deploymentId,
            destinationKeyName);

        var params = {
            Bucket: artifactsBucket,
            Key: keyPath,
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
        var bucketName = util.format('%s-artifacts-%s', s3config.bucket, region);

        var params = {
            Bucket: bucketName,
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
                bucket: bucketName,
            });
        }).then(function(state) {
            var keyPrefix = util.format('%s%s/%s/artifacts/',
                s3config.keyPrefix,
                config.currentDeployment.ref.project,
                state.timestamp);

            var params = {
                Bucket: bucketName,
                Prefix: keyPrefix,
            };

            return s3listObjects(params).then(function(data) {
                if (data.IsTruncated) {
                    throw new Error('Internal error: truncated list object requests are not implemented');
                }
                var keys = _.map(_.filter(data.Contents, function(elem) {
                    return elem.Key.length > keyPrefix.length;
                }), function(elem) {
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
