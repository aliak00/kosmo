var Resource = require('./resource')
    , Output = require('./output');

function Template() {
    if (!(this instanceof Template)) {
        return new Template();
    }

    this.resources = {};
    this.outputs = {};
}

Template.prototype.addOutput = function(output) {
    if (!(output instanceof Output)) {
        throw new Error('Not an Output: ' + output);
    }

    if (this.outputs[output.name]) {
        throw new Error('Found duplicate output name: ' + output.name);
    }

    this.outputs[output.name] = output;
}

Template.prototype.addResource = function(resource) {
    if (!(resource instanceof Resource)) {
        throw new Error('Not a Resource: ' + resource);
    }

    if (this.resources[resource.name]) {
        throw new Error('Found duplicate resource name: ' + resource.name);
    }

    this.resources[resource.name] = resource;
}

Template.prototype.toJson = function() {
    var cft = {};

    for (key in this.resources) {
        cft.Resources = cft.Resources || {};
        cft.Resources[key] = this.resources[key].toObject();
    }

    for (key in this.outputs) {
        cft.Outputs = cft.Outputs || {};
        cft.Outputs[key] = this.outputs[key].toObject();
    }

    return JSON.stringify(cft, function(key, value) {
        if (typeof value === 'boolean') {
            return value.toString();
        }

        if (typeof value === 'number') {
            return value.toString();
        }

        if (value instanceof Resource) {
            return { Ref: value.name };
        }

        return value;
    }, 2);
}

module.exports = Template;
