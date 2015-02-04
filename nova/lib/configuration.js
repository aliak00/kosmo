var _ = require('underscore')
    , fs = require('fs');

function loadConfiguration() {
    var default_config = {
        s3: {
            region: null,
            bucket: null,
            keyPrefix: '',
        },

        currentDeployment: {
            id: null,
            date: null,
            ref: null,
        },
    };

    var filename = process.env['HOME'] + '/.novacfg';
    if (fs.existsSync(filename)) {
        var data = fs.readFileSync(filename);
        var config = JSON.parse(data) || {};
    }
    return _.extend(default_config, config);
}

module.exports = loadConfiguration();
