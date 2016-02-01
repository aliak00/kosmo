var _ = require('lodash')
    , q = require('q')
    , AWS = require('aws-sdk')
    , archiver = require('archiver')
    , util = require('util')
    , utils = require('./utils')
    , path = require('path')
    , fs = require('fs')
    , config = require('./configuration')
    , program = require('./program')
    , s3utils = require('./s3utils')
    , minimatch = require('minimatch')
    , assert = require('assert')
    , moment = require('moment')
    , uuid = require('node-uuid');

var ArtifactType = {
    EBApp: 'EBApp',
    ZipFile: 'ZipFile',
};

function Artifact(type, pathToArtifact) {
    if (!(this instanceof Artifact)) {
        return new Artifact(type, searchPath);
    }

    if (!_.includes(ArtifactType, type)) {
        throw new Error('Artifact type must be one of: ' + _.keys(ArtifactType).join(','));
    }

    this.type = type;
    this.path = pathToArtifact;
}

function walkFiles(directoryPath, callback, filter) {
    var readdir = utils.pbind(fs.readdir, fs, directoryPath);
    var stat = utils.pbind(fs.stat, fs);
    return readdir().then(function(files) {
        var info = _.reduce(files, function(memo, file) {
            file = path.join(directoryPath, file);
            return {
                files: memo.files.concat([file]),
                statPromises: memo.statPromises.concat([stat(file)])
            }
        }, { files: [], statPromises: [] });
        return Promise.all(info.statPromises).then(function(stats) {
            return _.reduce(info.files, function(memo, file, index) {
                var stat = stats[index];
                if (!filter || filter(file, stat)) {
                    memo[file] = stats[index];
                }
                return memo;
            }, {});
        }).then(function(entries) {
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
            return Promise.all(promises);
        });
    });
};

Artifact.createZipFile = function(destinationName, sourcePath, options) {
    options = options || {};

    if (program.options.verbose) {
        console.log('Creating zip archive', destinationName);
    }

    if (!path.extname(destinationName)) {
        destinationName += '.zip';
    }

    var tempdir = '/tmp/';
    var destinationPath = path.join(tempdir, destinationName);

    if (destinationPath.indexOf(tempdir) !== 0) {
        throw new Error('createZipFile: destinationName should not try to exit its sandbox');
    }

    return new Promise((resolve, reject) => {
        var output = fs.createWriteStream(destinationPath);
        var archive = archiver('zip');

        output.on('close', function() {
            if (program.options.verbose) {
                var size = archive.pointer();
                var sizeString;
                if (size >= 1024 * 1024) {
                    sizeString = util.format('%d MB', Math.round(size / 1024 / 1024));
                } else if (size >= 1024) {
                    sizeString = util.format('%d KB', Math.round(size / 1024));
                } else {
                    sizeString = util.format('%d bytes', size);
                }
                console.log(util.format('Made %s of size %s', destinationName, sizeString));
            }
            var artifact = new Artifact(ArtifactType.ZipFile, destinationPath);
            resolve(artifact);
        });

        archive.on('error', function(err) {
            throw err;
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
            if (program.options.verbose) {
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
        });
    });
};

Artifact.createEbZipFile = function(destinationName, sourcePath, options) {
    return Artifact.createZipFile(destinationName, sourcePath, options).then(artifact => {
        artifact.type = ArtifactType.EBApp;
        return artifact;
    });
}

Artifact.getMeta = function(projectName, artifactName) {
    var rootBucket = program.getRootBucket();
    var s3 = new AWS.S3({ region: rootBucket.region, signatureVersion: 'v4' });
    var artifactMetaInfoKey = `meta/${projectName}/artifacts/${artifactName}/latest.json`;
    var getLatestArtifactInfo = utils.pbind(s3.getObject, s3, {
        Bucket: rootBucket.name,
        Key: artifactMetaInfoKey,
    });
    return getLatestArtifactInfo().then(data => {
        return JSON.parse(data.Body.toString());
    }, err => {
        if (err.code === 'NoSuchKey') {
            return null;
        }
        throw err;
    });
}

Artifact.setMeta = function(projectName, artifactName, metaInfo) {
    var rootBucket = program.getRootBucket();
    var s3 = new AWS.S3({ region: rootBucket.region, signatureVersion: 'v4' });
    var artifactMetaInfoKey = `meta/${projectName}/artifacts/${artifactName}/latest.json`;
    var putObject = utils.pbind(s3.putObject, s3, {
        Bucket: rootBucket.name,
        Key: artifactMetaInfoKey,
        Body: JSON.stringify(metaInfo, null, 2),
    });
    return putObject();
}

Artifact.find = function(projectName, artifactName) {

    return Artifact.getInfo(projectName, artifactName).then(info => {

    });

    var projectName = options.projectName;
    var artifactName = options.artifactName;
    var rootBucket = program.getRootBucket();
    var s3 = new AWS.S3({ region: rootBucket.region, signatureVersion: 'v4' });
    var artifactMetaInfoKey = `${projectName}/artifacts/${artifactName}/latest.json`;

    var getLatestArtifactInfo = utils.pbind(s3.getObject, s3, {
        Bucket: rootBucket.name,
        Key: artifactMetaInfoKey,
    });

}

/*Artifact.find = function(callback, region, keyPrefix) {
    var deferred = callback ? undefined : q.defer();

    q().then(function() {
        var s3 = new AWS.S3({ region : region });
        var s3listObjects = q.nbind(s3.listObjects, s3);

        var s3config = program.getBucket();
        var bucketName = util.format('%s-artifacts-%s', s3config.name, region);

        var params = {
            Bucket: bucketName,
            Prefix: util.format('%s%s/', keyPrefix, config.currentDeployment.ref.project),
        };

        return s3listObjects(params).then(function(data) {
            if (data.IsTruncated) {
                throw new Error('Internal error: truncated list object requests are not implemented');
            }
            var key = _.last(data.Contents).Key;
            key = key.substr(params.Prefix.length);
            var timestamp = key.split('/')[0];
            return {
                timestamp: timestamp,
                bucket: bucketName,
            };
        }).then(function(state) {
            var keyPrefix = util.format('%s%s/%s/artifacts/',
                keyPrefix,
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
            if (program.options.verbose) {
                var names = _.map(state.keys, function(key) {
                    return path.basename(key);
                });
                console.log(util.format('Found artifact(s) %s: %s', state.timestamp, names.join(', ')));
            }
            callback(null, artifacts);
            deferred && deferred.resolve(artifacts);
        });
    }).catch(function(err) {
        callback(err);
        deferred && deferred.reject(err);
    }).done();

    return deferred ? deferred.promise : undefined;
};*/

Artifact.excludesFilter = function(excludes) {
    var matchers = _.map(excludes, function(excludePattern) {
        return minimatch.filter(excludePattern, { matchBase: true });
    });
    var any = function(filepath) {
        return _.some(matchers, function(matcher) {
            return matcher(filepath);
        });
    };

    return function(filepath, stats) {
        return !any(filepath);
    };
};

module.exports = _.extend(Artifact, {
    Type: ArtifactType,
});
