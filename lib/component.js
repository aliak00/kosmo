var AWS = require('aws-sdk')
    , changeCase = require('change-case')
    , program = require('./program')
    , path = require('path')
    , utils = require('./utils');

function Component(stackName) {
    if (!(this instanceof Component)) {
        return new Component(stackName);
    }

    this.stackName = stackName;
}

Component.makeStackName = function(projectName, componentName) {
    return changeCase.pascal(projectName + ' ' + componentName);
};

// TODO: make updateMetaData in deploy command use this.
Component.getMeta = function(projectName, componentName) {
    var kosmoBucket = program.getKosmoBucket();
    var s3 = new AWS.S3({ region: kosmoBucket.region });
    var getObject = utils.pbind(s3.getObject, s3);
    var keyPath = path.join(
        'meta',
        projectName,
        'templates',
        componentName,
        'latest.json'
        );
    return getObject({
        Bucket: kosmoBucket.name,
        Key: keyPath,
    }).then(data => {
        return JSON.parse(data.Body.toString());
    }, err => {
        if (err.code === 'NoSuchKey') {
            return null;
        }
        throw err;
    });
};

module.exports = Component;
