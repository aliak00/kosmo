var _ = require('underscore')
    , q = require('q')
    , AWS = require('aws-sdk')
    , archiver = require('archiver')
    , util = require('util')
    , path = require('path')
    , fs = require('fs')
    , config = require('./configuration')
    , s3utils = require('./s3utils');

module.exports.createArchive = function(destinationName, sourcePath, callback) {
    var deferred;

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

    archive
        .directory(sourcePath, false)
        .finalize();

    return deferred ? deferred.promise : undefined;
};

module.exports.deployArchive = function(sourcePath, options, callback) {
    options = options || {};

    var deferred;

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
