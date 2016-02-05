 var _ = require('lodash')
    , AWS = require('aws-sdk')
    , program = require('../program')
    , util = require('util')
    , utils = require('../utils');

var S3_BUCKET_MAX_LENGTH = 63;
var DEFAULT_BUCKET_REGION = 'eu-west-1';

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.options = opts.options;

    if (this.options.bucket && !this.options.region) {
        throw new Error('If you specify bucket name you must also specify region.');
    }

    this.dataBucket = this.options['data-bucket'];
    this.bucketName = this.options['bucket-name'];

    if (!program.initialized() && this.dataBucket) {
        throw new Error('Please run nova init before creating a data-bucket.');
    }

    if (program.initialized() && !this.dataBucket) {
        throw new Error('Nova already seems to be initialized for profile ' + program.getProfile());
    }

    if (this.dataBucket && !this.options.region) {
        throw new Error('Data bucket initialization requires region as well.');
    }

    if (this.dataBucket) {
        if (program.getNovaBucket().region === this.options.region) {
            throw new Error('No need to initialize data bucket in this region.');
        }
    }

    this.region = this.options.region || DEFAULT_BUCKET_REGION;
}

Command.options = [
    ['', 'data-bucket', 'Tells nova that you are initializing a data bucket.'],
    ['', 'bucket-name', 'What you want to call the bucket being created'],
    ['', 'region=ARG', 'Which region to initialize the nova bucket in'],
];
Command.usageText = '[options]';
Command.descriptionText = 'Initialize nova for an aws account';

Command.prototype.execute = function() {
    var s3 = new AWS.S3({region: this.options.region })
    var iam = new AWS.IAM();

    var getUser = utils.pbind(iam.getUser, iam);
    return getUser().then((userData) => {
        // arn format => arn:partition:service:region:account-id:resource
        return userData.User.Arn.split(':')[4];
    }).then(awsAccountId => {
        if (!this.options.region) {
            console.log('No region specified. Defaulting to ' + DEFAULT_BUCKET_REGION);
        }

        var bucketName = this.bucketName || util.format('nova-%s-%s', this.region, awsAccountId);
        if (!this.bucketName) {
            console.log('No bucket name specified. Defaulting to ' + bucketName);
        }

        if (bucketName.length > S3_BUCKET_MAX_LENGTH) {
            throw new Error('Oops. Bucket name too long - ' + S3_BUCKET_MAX_LENGTH + ' characters max');
        }

        if (program.options.verbose) {
            console.log('Creating nova bucket');
        }
        var createBucket = utils.pbind(s3.createBucket, s3, {
            Bucket: bucketName,
            ACL: 'private',
            CreateBucketConfiguration: {
                LocationConstraint: this.region,
            },
        });

        return Promise.all([awsAccountId, bucketName, createBucket()]);
    }).then(values => {
        var awsAccountId = values[0];
        var bucketName = values[1];
        var bucketData = values[2];

        if (!this.dataBucket) {
            return program.setAwsAccountId(awsAccountId).then(() => {
                return program.setNovaBucket({
                    name: bucketName,
                    region: this.region,
                    location: bucketData.Location,
                });
            });
        } else {
            return program.setDataBucket({
                name: bucketName,
                region: this.region,
                location: bucketData.Location,
            });
        }
    }, err => {
        if (err.code === 'BucketAlreadyOwnedByYou') {
            // TODO: Make better error analysis here.
            // Should not get here if nova config file and account is in sync
            throw new Error('You already seem to own this bucket.');
        }
        throw err;
    });
}

module.exports = Command;
