var _ = require('lodash')
    , Artifact = require('../artifact')
    , AWS = require('aws-sdk')
    , novalib = require('../nova-lib')
    , fs = require('fs')
    , moment = require('moment')
    , NovaError = require('../nova-error')
    , program = require('../program')
    , Project = require('../project')
    , ProjectRef = require('../project-ref')
    , path = require('path')
    , util = require('util')
    , utils = require('../utils');

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.commandOptions = opts.options;

    if (_(opts.argv).isEmpty()) {
        throw new Error('Missing project reference');
    } else if (opts.argv.length !== 1) {
        throw new Error('Too many project references specified');
    }

    var ref = ProjectRef.parse(opts.argv[0]);
    this.project = new Project(ref.name);
    this.artifactName = ref.subname;

    if (!this.artifactName) {
        throw new Error('Build command needs an artifact name.');
    }
}

Command.options = [];
Command.usageText = '[options] project_name/artifact_name';
Command.descriptionText = 'Builds artifacts for the project';

function ensureBucketsExist(regions) {
    var regionsWithoutBuckets = _.filter(regions, region => {
        return program.getNovaBucket().region !== region
            && program.getDataBucket(region) === null;
    });

    if (regionsWithoutBuckets.length === 0) {
        return Promise.resolve();
    }

    var question = util.format(
'Artifacts cannot be placed in regions without nova data buckets.\n\
You can ether run nova init --data-bucket and create the buckets\n\
or nova can create default buckets for you.\n\
Should nova create buckets in regions %s and carry on?\
', regionsWithoutBuckets.join(','));

    return utils.yesorno(question).then(shouldCreateBuckets => {
        if (!shouldCreateBuckets) {
            return Promise.reject(new NovaError('Please init buckets in region(s) ' + regionsWithoutBuckets.join(',') + '. See nova init.'));
        }
        var awsAccountId = program.getAwsAccountId();
        // Params for aws.createBucket
        var bucketsToCreate = _.map(regionsWithoutBuckets, region => {
            return {
                Bucket: util.format('nova-%s-%s', region, awsAccountId),
                ACL: 'private',
                CreateBucketConfiguration: {
                    LocationConstraint: region,
                },
            };
        });
        if (program.options.verbose) {
            console.log('Creating buckets: ' + _.map(bucketsToCreate, 'Bucket').join(','));
        }
        var createBucketPromises = _.map(bucketsToCreate, bucketParams => {
            var region = bucketParams.CreateBucketConfiguration.LocationConstraint;
            var s3 = new AWS.S3({ region: region, signatureVersion: 'v4' });
            var createBucket = utils.pbind(s3.createBucket, s3, bucketParams);
            return createBucket();
        });
        return Promise.all(createBucketPromises).then(values => {
            // Transform into objects accepted by Program.setDataBucket
            return _.map(values, (bucketData, index) => {
                return {
                    region: regionsWithoutBuckets[index],
                    name: bucketsToCreate[index].Bucket,
                    location: bucketData.Location,
                };
            });
        })  ;
    }).then(buckets => {
        return _.map(buckets, bucket => {
            return program.setDataBucket(bucket);
        });
    });
}

function uploadArtifactToS3(keyPath, artifact, regions) {
    var uploadInfo = _.map(regions, region => {
        var bucket = program.getBucket(region);
        return {
            bucketName: bucket.name,
            bucketRegion: region,
            bucketKeyPath: keyPath,
            artifactReadStream: fs.createReadStream(artifact.path),
        };
    });

    var uploadPromises = _.map(uploadInfo, info => {
        var params = {
            Bucket: info.bucketName,
            Key: info.bucketKeyPath,
            Body: info.artifactReadStream,
        };
        var s3 = new AWS.S3({ region : info.bucketRegion, signatureVersion: 'v4' });

        var s3ManagedUploader = s3.upload(params);
        var lastProgress = 0;
        if (program.options.verbose) {
            s3ManagedUploader.on('httpUploadProgress', function(event) {
                var thisProgress = event.loaded / event.total * 100;
                if (thisProgress === 100 || thisProgress > lastProgress + 7) {
                    console.log('Progress (', info.bucketRegion, ')', thisProgress.toFixed(1), '% -', event.loaded, 'of', event.total);
                    lastProgress = thisProgress;
                }
            });
        }

        var s3ManagedUploaderSend = utils.pbind(s3ManagedUploader.send, s3ManagedUploader);
        return s3ManagedUploaderSend().then(function(data) {
            return {
                bucket: info.bucketName,
                key: info.bucketKeyPath,
                region: info.bucketRegion,
                url: data.Location,
            };
        });
    });

    return Promise.all(uploadPromises);
}

Command.prototype.execute = function() {
    var metaInfo = {
        timestamp: moment().utc().format('YYYYMMDDTHHmmss'),
    };

    if (program.options.verbose) {
        console.log('Loading project ' + this.project.name);
    }

    this.project.load(novalib.init({
        projectName: this.project.name,
    }));

    var artifactDef = this.project.findArtifact(this.artifactName);
    if (!artifactDef) {
        throw new Error(`Failed to find artifact '${this.artifactName}' in project '${this.project.name}'`);
    }

    metaInfo.regions = typeof artifactDef.region === 'string'
        ? [artifactDef.region]
        : artifactDef.region;

    if (program.options.verbose) {
        console.log('Ensuring nova buckets in regions ' + metaInfo.regions.join(','));
    }

    return ensureBucketsExist(metaInfo.regions).then(() => {
        if (program.options.verbose) {
            console.log('Building artifact ' + this.artifactName);
        }

        return utils.pdone(artifactDef.build, artifactDef);
    }).then(artifact => {
        if (artifact.type !== Artifact.Type.EBApp
            && artifact.type !== Artifact.Type.Lambda) {
            throw new Error('Only EBApp,Lambda artifact type supported currently');
        }

        if (program.options.verbose) {
            console.log('Uploading artifact to regions ' + metaInfo.regions.join(','));
        }

        var baseName = path.basename(artifact.path);
        var keyPath = path.join(
            'data',
            this.project.name,
            'artifacts',
            this.artifactName,
            metaInfo.timestamp,
            baseName);

        return uploadArtifactToS3(keyPath, artifact, metaInfo.regions);
    }).then(values => {
        if (program.options.verbose) {
            console.log('Updating meta info...');
        }

        delete metaInfo.regions;
        metaInfo.artifacts = _.keyBy(values, 'region');

        return Artifact.setMeta(this.project.name, this.artifactName, metaInfo);
    });
};

module.exports = Command;
