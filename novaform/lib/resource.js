var _ = require('underscore')
    , TagValue = require('./tag-value');

function Resource(type, name, properties) {
    if (!(this instanceof Resource)) {
        return new Resource(type, name, properties);
    }

    this.type = type;
    this.name = name;
    this.properties = properties;
    this.extendWith = undefined;
    this.metadata = undefined;
}

Resource.prototype._expandTags = function() {
    if (!this.properties.Tags) {
        return;
    }

    var tags = [];
    for (var key in this.properties.Tags) {
        var value = this.properties.Tags[key];
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

    this.properties.Tags = tags;
}

Resource.prototype._modifyPortRange = function() {
    if (!this.PortRange || !Array.isArray(this.PortRange)) {
        return;
    }

    var portRange = {
        From: this.PortRange[0],
        To: this.PortRange[1],
    };

    this.PortRange = portRange;
}

Resource.prototype.toObject = function() {
    // TODO: fix me, remove this hack from generic Resource object to the concrete subclasses where needed.
    this._expandTags();
    this._modifyPortRange();

    var object = {
        Type: this.type
    };

    if (this.properties.DependsOn) {
        object.DependsOn = this.properties.DependsOn;
        delete this.properties.DependsOn;
    }

    for (key in this.extendWith) {
        object[key] = this.extendWith[key];
        delete this.properties[key];
    }

    if (this.properties) {
        object.Properties = this.properties;
    }

    if (this.metadata) {
        object.Metadata = this.metadata;
    }

    return object;
};

module.exports = Resource;
