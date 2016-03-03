var _ = require('lodash')
    , Artifact = require('./artifact')
    , program = require('./program')
    , utils = require('./utils');

function createXArtifact(createArtifact, thisArg) {
    return (destinationName, sourcePath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        } else {
            options = options || {};
        }
        var deferred = utils.pdefer();
        var actualOptions = _.pick(options, 'filter');
        createArtifact.call(thisArg, destinationName, sourcePath, actualOptions).then(function(artifact) {
            callback && callback(null, artifact);
            deferred.resolve(artifact);
        }, err => {
            callback && callback(err, null);
            deferred.reject(err);
        });
        return deferred.promise;
    };
}

module.exports.init = function(params) {
    return {
        createZipArtifact: createXArtifact(Artifact.createZipFile, Artifact),
        createEbArtifact: createXArtifact(Artifact.createEbZipFile, Artifact),
        createLambdaArtifact: createXArtifact(Artifact.createLambdaZipFile, Artifact),

        findArtifact: function(region, artifactName) {
            return Artifact.find(region, params.projectName, artifactName);
        },

        getAwsAccountId: function() {
            return program.getAwsAccountId();
        },

        excludesFilter: function(excludes) {
            return Artifact.excludesFilter(excludes);
        },
    };
};
