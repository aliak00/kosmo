var novaform = require('novaform'),
    util = require('util');

function Template() {
    if (!(this instanceof Template)) {
        return new Template();
    }

    this._resources = {};
}

function createResourceGroupFromRefs(resourceGroup, refs) {
    for (key in refs) {
        if (!(refs[key] instanceof novaform.Resource)) {
            createResourceGroupFromRefs(resourceGroup, refs[key])
        } else {
            resourceGroup.add(refs[key]);
        }
    }
}

Template.prototype.toResourceGroup = function() {
    var resourceGroup = novaform.ResourceGroup();
    createResourceGroupFromRefs(resourceGroup, this._resources);
    return resourceGroup;
};

Template.prototype._addResource = function(resource) {
    if (resource.name in this._resources) {
        throw new Error(util.format('Internal error: duplicate resource name detected: "%s"', resource.name));
    }
    this._resources[resource.name] = resource;
    return resource;
};

module.exports = Template;