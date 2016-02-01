 var fs = require('fs')
    , program = require('../program')
    , path = require('path')
    , moment = require('moment')
    , util = require('util')
    , utils = require('../utils')
    , AWS = require('aws-sdk')
    , readline = require('readline')
    , _ = require('lodash');

var S3_BUCKET_MAX_LENGTH = 63;
var DEFAULT_BUCKET_REGION = 'eu-west-1';

function Command(opts) {
    if (!(this instanceof Command)) {
        return new Command(opts);
    }

    this.options = opts.options;

    if (this.options.bucket && !this.options.region) {
        throw new Error('If you specify bucket name you must also specify region');
    }

    if (!this.options.root && !this.options.secondary) {
        throw new Error('You must specify either a root bucket or a secondary bucket');
    }

    if (this.options.root && this.options.secondary) {
        throw new Error('You cannot specify both root and secondary');
    }

    if (this.options.secondary && !this.options.region) {
        throw new Error('Secondary bucket initialization requires region as well')
    }

    // TODO: Make sure root not already created
    // TODO: Make sure secondary in region not already created
    // TODO: Make sure secondary is not same region as root

    this.region = this.options.region || DEFAULT_BUCKET_REGION;
}

Command.options = [
    ['', 'root', 'Tells nova this is a root bucket'],
    ['', 'secondary', 'Tells nova this is a secondary bucket'],
    ['', 'region=ARG', 'Which region to initialize the nova bucket in'],
    ['', 'bucket=ARG', 'The name you want to give the nova bucket'],
];
Command.usageText = '[options] (--secondary|--root)';
Command.descriptionText = 'Initialize nova for an aws account';

Command.prototype.execute = function() {
    var s3 = new AWS.S3({region: this.options.region })
    var iam = new AWS.IAM();

    var getUser = utils.pbind(iam.getUser, iam);
    return getUser().then((userData) => {
        // arn format => arn:partition:service:region:account-id:resource
        return userData.User.Arn.split(':')[4];
    }).then(userAccountId => {
        if (!this.options.region) {
            console.log('No region specified. Defaulting to ' + DEFAULT_BUCKET_REGION);
        }

        var bucketName = this.options.bucket || util.format('nova-%s-%s', this.region, userAccountId);
        if (!this.options.bucket) {
            console.log('No bucket specified. Defaulting to ' + bucketName);
        }

        if (bucketName.length > S3_BUCKET_MAX_LENGTH) {
            throw new Error('Oops. Nova bucket name too long - ' + S3_BUCKET_MAX_LENGTH + ' characters max');
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

        return Promise.all([userAccountId, bucketName, createBucket()]);
    }).then(values => {
        var userAccountId = values[0];
        var bucketName = values[1];
        var bucketData = values[2];

        if (this.options.root) {
            return program.setUserId(userAccountId).then(() => {
                return program.setRootBucket({
                    name: bucketName,
                    region: this.region,
                    location: bucketData.Location,
                });
            });
        } else {
            return program.setSecondaryBucket({
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
