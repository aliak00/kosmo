var _ = require('lodash')
    , path = require('path')
    , fs = require('fs')
    , utils = require('./utils');

// TODO: Change after deployments tested
const CONFIG_FILE_NAME = '.novacfg2';

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

Program.setUserId = function(userId) {
    var profile = Program.getProfile();
    var newConfig = _.cloneDeep(Program.config);
    _.set(newConfig, `profiles.${profile}.userId`, userId);
    return writeNewConfig(newConfig);
}

Program.getUserId = function() {
    var userId = Program.getProfileConfig().userId;
    if (!userId) {
        throw new Error('UserId does not exist for profile ' + Program.getProfile() + '. Please run nova init --root.');
    }
    return userId;
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
        throw new Error('Root bucket does not exist for profile ' + Program.getProfile() + '. Please run nova init --root.');
    }
    return bucket;
}

Program.setSecondaryBucket = function(bucketInfo) {
    var profile = Program.getProfile();
    var newConfig = _.cloneDeep(Program.config);
    _.set(newConfig, `profiles.${profile}.secondaryBuckets.${bucketInfo.region}`, {
        name: bucketInfo.name,
        location: bucketInfo.location,
    });
    return writeNewConfig(newConfig);
}

Program.getSecondaryBucket = function(region) {
    var config = Program.getProfileConfig();
    var bucket = _.get(config, `secondaryBuckets.${region}`, null);
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
    return Program.getSecondaryBucket(region);
}

module.exports = Program;
