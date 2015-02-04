var util = require('util');

module.exports = function(nova) {
    var callbacks = {
        name: 'callbacks',

        dependencies: [
        ],

        region: 'eu-west-1',

        build: function(deps, options, done) {
            var applicationPath = __dirname;
            nova.utils.createArchive('pluto', applicationPath, function(err, path) {
                if (err) {
                    return done(err);
                }
                nova.utils.deployArchive(path, function(err, archive) {
                    if (err) {
                        return done(err);
                    }

                    done(null, {});
                });
            });
        }
    };

    var promises = {
        name: 'promises',

        dependencies: [
        ],

        region: 'eu-west-1',

        build: function(deps, options, done) {
            var applicationPath = __dirname;
            return nova.utils.createArchive('pluto', applicationPath)
                .then(function(path) {
                    return nova.utils.deployArchive(path);
                });
        }
    };

    var project = {
        name: 'archive',

        components: [
            callbacks,
            promises,
        ],
    };

    return project;
};
