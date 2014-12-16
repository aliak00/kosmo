var Template = require('./template')
    , Resource = require('./resource');

function Stack(name, description) {
    if (!(this instanceof Stack)) {
        return new Stack(name);
    }

    this.name = name;
    this.description = description;
    this.templates = [];
}

Stack.prototype.add = function(template) {
    if (!(template instanceof Template)) {
        throw new Error('template must be instanceof Template');
    }

    this.templates.push(template);
}

Stack.prototype.toJson = function() {
    var cft = {
        AWSTemplateFormatVersion: '2010-09-09'
    };

    if (this.description) {
        cft.Description = description;
    }

    this.templates.forEach(function(template) {
        for (key in template.resources) {
            cft.Resources = cft.Resources || {};
            cft.Resources[key] = template.resources[key].toObject();
        }

        for (key in template.outputs) {
            cft.Outputs = cft.Outputs || {};
            cft.Outputs[key] = template.outputs[key].toObject();
        }
    });

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

module.exports = Stack;