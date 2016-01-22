var _ = require('lodash')
    , path = require('path')
    , fs = require('fs')
    , utils = require('./utils');

const CONFIG_FILE_NAME = '.novacfg2';

function loadConfigFile() {
    try {
        var filename = fs.statSync(path.join(process.env['HOME'], CONFIG_FILE_NAME));
        var data = fs.readFileSync(filename);
        var config = JSON.parse(data);
    } catch (e) {}

    return config || {
        profiles: {},
    };
}

var Program = {
    // Persistent config settings for nova
    config: loadConfigFile(),

    // Common command line args on this run
    options: {},

    // Parse yaml params file values
    params: {},
};

Program.setBucketForCurrentProfile = function(bucketInfo) {
    var currentProfile = Program.options.profile;

    var newConfig = _.cloneDeep(Program.config);
    newConfig.profiles[currentProfile] = bucketInfo;

    var filename = path.join(process.env['HOME'], CONFIG_FILE_NAME);
    var writeFile = utils.pbind(fs.writeFile, fs, filename, JSON.stringify(newConfig, null, 2));

    return writeFile().then(function() {
        Program.config = newConfig;
    });
}

module.exports = Program;
