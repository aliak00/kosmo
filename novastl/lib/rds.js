var novaform = require('novaform')
    , _ = require('underscore');

function Rds(options) {
    var vpc = options.vpc;
    var allowedSshCidr = options.allowedSshCidr;
    var keyName = options.keyName;
    var imageId = options.imageId;
    var instanceType = options.instanceType;

    var cft = novaform.Template();

    return cft;
}

module.exports = Rds;