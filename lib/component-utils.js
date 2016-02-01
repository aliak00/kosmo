var Artifact = require('./artifact');

module.exports.bind = function(params) {
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

        findArtifact: function(artifactName) {
            return Artifact.find(params.projectName, artifactName);
        }
    };
};
