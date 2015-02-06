var ResourceGroup = require('./resource-group')
    , Resource = require('./resource')
    , Output = require('./output')
    , utils = require('./utils');

function Stack(name, description) {
    if (!(this instanceof Stack)) {
        return new Stack(name);
    }

    this.name = name;
    this.description = description;
    this.resources = [];
    this.outputs = {};
}

Stack.prototype.add = function(stackItems) {
    if (!(stackItems instanceof Array)) {
        stackItems = [stackItems];
    }
    var that = this;
    stackItems.forEach(function(stackItem) {
        if (stackItem instanceof ResourceGroup) {
            that.resources.push(stackItem);
        } else if (stackItem instanceof Resource) {
            var rg = ResourceGroup();
            rg.add(stackItem);
            that.resources.push(rg);
        } else if (stackItem instanceof Output) {
            if (that.outputs[stackItem.name]) {
                throw new Error('Cannot add duplicate output: ' + stackItem.name);
            }
            that.outputs[stackItem.name] = stackItem;
        } else {
            throw new Error('stackItem must be instanceof Resource, ResourceGroup or Output');
        }
    });
}

Stack.prototype.toObject = function() {
    var object = {
        AWSTemplateFormatVersion: '2010-09-09'
    };

    if (this.description) {
        object.Description = this.description;
    }

    this.resources.forEach(function(rg) {
        for (key in rg.resources) {
            object.Resources = object.Resources || {};
            object.Resources[key] = rg.resources[key].toObject();
        }
    });

    for (key in this.outputs) {
        object.Outputs = object.Outputs || {};
        object.Outputs[key] = this.outputs[key].toObject();
    }

    return object;
}

Stack.prototype.toJson = function() {
    return JSON.stringify(this.toObject(), utils.jsonReplacer, 2);
}

Stack.prototype.isEmpty = function() {
    return this.resources.length === 0;
}

module.exports = Stack;