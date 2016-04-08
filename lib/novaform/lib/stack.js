'use strict';

var AWSResource = require('./aws-resource')
    , Output = require('./output')
    , Parameter = require('./parameter')
    , utils = require('../../utils')
    , _ = require('lodash');

class Stack {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.resources = [];
        this.outputs = {};
        this.parameters = {};
    }

    add(stackItems) {
        if (!(stackItems instanceof Array)) {
            stackItems = [stackItems];
        }
        var that = this;
        stackItems.forEach(function(stackItem) {
            if (stackItem instanceof AWSResource) {
                that.resources.push(stackItem);
            } else if (stackItem instanceof Output) {
                if (that.outputs[stackItem.name]) {
                    throw new Error('Cannot add duplicate output: ' + stackItem.name);
                }
                that.outputs[stackItem.name] = stackItem;
            } else if (stackItem instanceof Parameter) {
                if (that.parameters[stackItem.name]) {
                    throw new Error('Cannot add duplicate parameter: ' + stackItem.name);
                }
                that.parameters[stackItem.name] = stackItem;
            } else {
                throw new Error('stackItem must be instanceof Resource, Output or Parameter');
            }
        });
    }

    validate() {
        return _.reduce(this.resources, (memo, resource) => {
            const errorData = resource.validate();
            memo.errors[resource.name] = memo.errors[resource.name] || [];
            memo.warnings[resource.name] = memo.warnings[resource.name] || [];
            memo.errors[resource.name] = memo.errors[resource.name].concat(errorData.errors);
            memo.warnings[resource.name] = memo.warnings[resource.name].concat(errorData.warnings);
            return memo;
        }, {
            errors: {},
            warnings: {},
        });
    }

    toObject() {
        var description = this.description;

        var resources = _.reduce(this.resources, function(memo, resource) {
            return _.extend(memo, utils.zipObject([resource.name], [resource.toObject()]));
        }, {});
        var outputs = _.reduce(this.outputs, function(memo, output) {
            return _.extend(memo, utils.zipObject([output.name], [output.toObject()]));
        }, {});
        var parameters = _.reduce(this.parameters, function(memo, parameter) {
            return _.extend(memo, utils.zipObject([parameter.name], [parameter.toObject()]));
        }, {});

        return {
            AWSTemplateFormatVersion: '2010-09-09',
            Description: description,
            Resources: resources,
            Outputs: outputs,
            Parameters: parameters,
        };
    }

    toJson() {
        function jsonReplacer(key, value) {
            if (typeof value === 'boolean') {
                return value.toString();
            }

            if (typeof value === 'number') {
                return value.toString();
            }

            if (value instanceof AWSResource) {
                return { Ref: value.name };
            }

            return value;
        }
        return JSON.stringify(this.toObject(), jsonReplacer, 2);
    }

    isEmpty() {
        return this.resources.length === 0;
    };
}

module.exports = Stack;
