var Artifact = require('./artifact')
    , program = require('./program');

module.exports.init = function(params) {
    return {
        createZipArtifact: function(destinationName, sourcePath, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            } else {
                options = options || {};
            }
            return Artifact.createZipFile(destinationName, sourcePath, {
                filter: options.filter,
            }).then(function(artifact) {
                callback && callback(artifact);
                return artifact;
            });
        },

        createEbArtifact: function(destinationName, sourcePath, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            } else {
                options = options || {};
            }
            return Artifact.createEbZipFile(destinationName, sourcePath, {
                filter: options.filter,
            }).then(function(artifact) {
                callback && callback(artifact);
                return artifact;
            });
        },

        findArtifact: function(region, artifactName) {
            return Artifact.find(region, params.projectName, artifactName);
        },

        userId: function() {
            return program.getUserId();
        },
    };
};
