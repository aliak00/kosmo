var _ = require('lodash')
    , path = require('path')
    , fs = require('fs')
    , utils = require('./utils');

const CONFIG_FILE_NAME = '.novacfg';

function loadConfigFile() {
    try {
        var filename = path.join(process.env['HOME'], CONFIG_FILE_NAME);
        var data = fs.readFileSync(filename);
        var config = JSON.parse(data);
    } catch (e) {}

    return config || {
        profiles: {},
    };
}

function writeNewConfig(config) {
    var filename = path.join(process.env['HOME'], CONFIG_FILE_NAME);
    var writeFile = utils.pbind(fs.writeFile, fs, filename, JSON.stringify(config, null, 2));
    return writeFile().then(function() {
        Program.config = config;
    });
}

var Program = {
    // Persistent config settings for nova
    config: loadConfigFile(),

    // Common command line args on this run
    options: {},

    // Parsed yaml params file values
    params: {},
};

Program.getProfile = function() {
    var profile = Program.options.profile || process.env['AWS_ACCESS_KEY_ID'];
    if (!profile) {
        throw new Error('Profile does not exist.')
    }
    return profile;
}

Program.getProfileConfig = function() {
    var profile = Program.getProfile();
    var config = Program.config.profiles[profile];
    if (!config) {
        throw new Error(`Config does not exist for profile '${profile}'. Please run nova --profile ${profile} init`);
    }
    return config;
}

Program.setAwsAccountId = function(awsAccountId) {
    var profile = Program.getProfile();
    var newConfig = _.cloneDeep(Program.config);
    _.set(newConfig, `profiles.${profile}.awsAccountId`, awsAccountId);
    return writeNewConfig(newConfig);
}

Program.getAwsAccountId = function() {
    var awsAccountId = Program.getProfileConfig().awsAccountId;
    if (!awsAccountId) {
        throw new Error('AwsAccountId does not exist for profile ' + Program.getProfile() + '. Please run nova init');
    }
    return awsAccountId;
}

Program.setRootBucket = function(bucketInfo) {
    var profile = Program.getProfile();
    var newConfig = _.cloneDeep(Program.config);
    _.set(newConfig, `profiles.${profile}.rootBucket`, bucketInfo)
    return writeNewConfig(newConfig);
}

Program.getRootBucket = function() {
    var bucket = Program.getProfileConfig().rootBucket;
    if (!bucket) {
        throw new Error('Root bucket does not exist for profile ' + Program.getProfile() + '. Please run nova init');
    }
    return bucket;
}

Program.hasRoot = function(profile) {
    try {
        Program.getRootBucket();
    } catch (e) {
        return false;
    }
    return true
}

Program.setDataBucket = function(bucketInfo) {
    var profile = Program.getProfile();
    var newConfig = _.cloneDeep(Program.config);
    _.set(newConfig, `profiles.${profile}.dataBuckets.${bucketInfo.region}`, {
        name: bucketInfo.name,
        location: bucketInfo.location,
    });
    return writeNewConfig(newConfig);
}

Program.getDataBucket = function(region) {
    var config = Program.getProfileConfig();
    var bucket = _.get(config, `dataBuckets.${region}`, null);
    if (!bucket) {
        return null;
    }
    return _.extend(bucket, {
        region: region,
    });
}

Program.getBucket = function(region) {
    var rootBucket = Program.getRootBucket();
    if (rootBucket.region === region) {
        return rootBucket
    }
    return Program.getDataBucket(region);
}

module.exports = Program;
