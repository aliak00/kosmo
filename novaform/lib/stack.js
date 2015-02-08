var Resource = require('./resource')
    , Template = require('./template')
    , Output = require('./output')
    , utils = require('./utils')
    , _ = require('underscore');

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
        if (stackItem instanceof Resource) {
            that.resources.push(stackItem);
        } else if (stackItem instanceof Template) {
            that.resources.push.apply(that.resources, stackItem.resources());
        } else if (stackItem instanceof Output) {
            if (that.outputs[stackItem.name]) {
                throw new Error('Cannot add duplicate output: ' + stackItem.name);
            }
            that.outputs[stackItem.name] = stackItem;
        } else {
            throw new Error('stackItem must be instanceof Resource, Template or Output');
        }
    });
}

Stack.prototype.toObject = function() {
    var description = this.description;

    var resources = _.reduce(this.resources, function(memo, resource) {
        return _.extend(memo, _.object([resource.name], [resource.toObject()]));
    }, {});
    var outputs = _.reduce(this.outputs, function(memo, resource) {
        return _.extend(memo, _.object([resource.name], [resource.toObject()]));
    }, {});

    return {
        AWSTemplateFormatVersion: '2010-09-09',
        Description: description,
        Resources: resources,
        Outputs: outputs,
    };
}

Stack.prototype.toJson = function() {
    return JSON.stringify(this.toObject(), utils.jsonReplacer, 2);
}

Stack.prototype.isEmpty = function() {
    return this.resources.length === 0;
}

module.exports = Stack;
