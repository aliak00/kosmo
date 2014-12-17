var novaform = require('novaform')

function Template() {
    if (!(this instanceof Template)) {
        return new Template();
    }

    this.refs = {};
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
    createResourceGroupFromRefs(resourceGroup, this.refs);
    return resourceGroup;
}

module.exports = Template;