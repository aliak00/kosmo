var Resource = require('./resource')
    , utils = require('./utils');

function ResourceGroup() {
    if (!(this instanceof ResourceGroup)) {
        return new ResourceGroup();
    }

    this.resources = {};
}

ResourceGroup.prototype.add = function(resource) {
    if (!(resource instanceof Resource)) {
        throw new Error('Not a Resource: ' + resource);
    }

    if (this.resources[resource.name]) {
        throw new Error('Found duplicate resource name: ' + resource.name);
    }

    this.resources[resource.name] = resource;
}

ResourceGroup.prototype.toObject = function() {
    var object = {};

    for (key in this.resources) {
        object[key] = this.resources[key].toObject();
    }

    return object;
}

ResourceGroup.prototype.toJson = function() {
    return JSON.stringify(this.toObject(), utils.jsonReplacer, 2);
}

module.exports = ResourceGroup;
