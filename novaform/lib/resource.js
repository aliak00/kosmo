var _ = require('underscore')
    , TagValue = require('./tag-value');


function expandTags(options) {
    if (!options || !options.Tags) {
        return;
    }

    var tags = [];
    for (var key in options.Tags) {
        var value = options.Tags[key];
        var tag = {
            Key: key
        };
        if (value instanceof TagValue) {
            tag = _.extend(tag, value)
        } else {
            tag.Value = value;
        }
        tags.push(tag);
    }

    options.Tags = tags;
}

function modifyPortRange(options) {
    if (!options || !options.PortRange || !Array.isArray(options.PortRange)) {
        return;
    }

    var portRange = {
        From: options.PortRange[0],
        To: options.PortRange[1],
    };

    options.PortRange = portRange;
}

function Resource() {
    if (!(this instanceof Resource)) {
        return new Resource();
    }
}

Resource.prototype.toObject = function() {
    expandTags(this.properties);
    modifyPortRange(this.properties);
    var object = {
        Type: this.type
    };

    if (this.properties) {
        object.Properties = this.properties;
    }

    if (this.metadata) {
        object.Metadata = this.metadata;
    }

    return object;
}

module.exports = Resource;