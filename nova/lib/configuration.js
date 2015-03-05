var _ = require('underscore')
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

        get: function(domain, profile) {
            var cfg = this.default[domain];
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
