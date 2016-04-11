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
        // TODO: Move all the error checking in to the validate function.
        stackItems.forEach(function(stackItem) {
            if (stackItem instanceof AWSResource) {
                // TODO: Make this a map as well. I don't think there can be duplicate resources either.
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
                throw new Error('stackItem must be instanceof AWSResource, Output or Parameter');
            }
        });
    }

    validate() {
        function getValidationResults(objects) {
            return _.reduce(objects, (memo, object) => {
                const validationResults = object.validate();
                return {
                    errors: memo.errors.concat(validationResults.errors),
                    warnings: memo.warnings.concat(validationResults.warnings),
                };
            }, {
                errors: [],
                warnings: [],
            });
        }

        var allValidationResults = [
            getValidationResults(this.resources),
            getValidationResults(this.parameters),
            getValidationResults(this.outputs),
        ];

        return {
            errors: _.flatMap(allValidationResults, 'errors'),
            warnings: _.flatMap(allValidationResults, 'warnings'),
        };
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
        return JSON.stringify(this.toObject(), null, 2);
    }

    isEmpty() {
        return this.resources.length === 0;
    }
}

module.exports = Stack;
