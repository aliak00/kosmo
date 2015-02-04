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
        destinationName += '.tgz';
    }

    var tempdir = '/tmp/';
    var destinationPath = path.join(tempdir, destinationName);

    if (destinationPath.indexOf(tempdir) !== 0) {
        throw new Error('createArchive: destinationName should not try to exit its sandbox');
    }

    var output = fs.createWriteStream(destinationPath);
    var archive = archiver('tar', {
        gzip: true,
    });

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
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

module.exports.deployArchive = function(sourcePath, callback) {
    var deferred;

    if (typeof callback !== 'function') {
        callback = function() {};
        deferred = q.defer();
    }

    var sourceStream = fs.createReadStream(sourcePath);

    var destinationKeyName = path.basename(sourcePath);

    var bucketname = config.s3.bucket;
    var region = config.s3.region;
    var deploymentDateString = config.currentDeployment.date.format();
    var deploymentId = config.currentDeployment.id;
    var keypath = util.format('%s%s/%s/%s/artifacts/%s',
        config.s3.keyPrefix,
        config.currentDeployment.ref.project,
        config.currentDeployment.ref.component,
        deploymentId,
        destinationKeyName);

    var params = {
        Bucket: bucketname,
        Key: keypath,
        Body: sourceStream,
    };

    var s3 = new AWS.S3({ region : region });
    s3.upload(params, function(err, data) {
        if (err) {
            callback(err);
            deferred && deferred.reject(err);
            return;
        }
        var url = s3utils.urlForUploadParams(region, params);
        var result = {
            bucket: bucketname,
            key: keypath,
            url: url,
        };
        callback(null, result);
        deferred && deferred.resolve(result);
    });
};
