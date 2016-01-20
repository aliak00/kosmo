var _ = require('lodash')
    , fs = require('fs');

function loadConfiguration() {
    var default_config = {
        default: {
            s3: {
                region: null,
                bucket: null,
                keyPrefix: '',
            },
        },
        profiles: {},

        get: function(domain, profile) {
            var cfg = this.default[domain];
            profile = profile || this.programOptions.profile;
            if (profile) {
                var profilecfg = this.profiles[profile] || {};
                cfg = _.extend({}, cfg, profilecfg[domain]);
            }
            return cfg;
        },

        currentDeployment: {
            id: null,
            date: null,
            ref: null,
            region: null,
        },
        currentBuild: {
            date: null,
            project: null,
        },
        programOptions: {
        },
        paramsObject: {
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
