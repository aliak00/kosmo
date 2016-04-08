'use strict';

var _ = require('lodash');

function AWSResource(name, objectType, properties, attributes, validator) {
    if (!(this instanceof AWSResource)) {
        return new AWSResource(name, objectType, properties, attributes, validator);
    }

    // TODO: add a check that objectTyps is actually a type.object. Might need to
    // refactor types to have a base called Type or something so we can do something
    // like if (objectType instanceof types.Object), for eg.

    this.type = objectType;
    this.name = name;
    this.properties = properties;
    this.attributes = attributes;
    this.validator = validator;
}

AWSResource.prototype.validate = function() {
    var errors = [];

    if (!this.name) {
        errors.push('You can\'t leave out the resource name ya ninny');
    }

    var typeValidationErrors = this.type.validate(this.properties);

    if (!_.isUndefined(typeValidationErrors)) {
        errors = errors.concat(typeValidationErrors);
    }

    if (typeof this.validator === 'function') {
        const result = this.validator(this.properties);
        if (typeof result !== 'undefined') {
            errors.push(`Failed validation: "${result}"`);
        }
    }

    return errors;
};

AWSResource.prototype.toObject = function() {
    var errors = this.validate();
    if (errors.length) {
        var message = `resource (${this.name}):`;
        _.forEach(errors, function(error, index) {
            message += `\n  ${index}) ${error}`;
        });
        throw new class extends Error {
            constructor() {
                super(message);
                this.name = 'ValidationError';
            }
        };
    }

    var object = {
        Type: this.type.name,
        Properties: this.type.toCloudFormationValue(this.properties),
    };

    object = _.extend(object, this.attributes);

    return object;
};

AWSResource.define = function(typeName, propertyDefinitions, options) {
    // We require this in here because the structure of dependencies is a bit tangled.
    //
    // Basically:
    // * Resource are composed of Types
    // * Types can have Functions as values
    // * Types can have Resources as values
    // * Functions can have Resources as values
    //
    // So we have to break the cycle somewhere or we have a export race condition where
    // one of those modules may not be completely exported before being required, and you
    // end up with an empty object
    var types = require('./types');

    function Resource(name, properties, attributes) {
        if (!(this instanceof Resource)) {
            return new Resource(name, properties, attributes);
        }
        options = options || {};
        var validator = typeof options.validator === 'function' ? options.validator : null;
        AWSResource.call(this, name, types.object(typeName, propertyDefinitions), properties, attributes, validator);
    }
    Resource.prototype = Object.create(AWSResource.prototype);
    Resource.prototype.constructor = Resource;

    return Resource;
};

module.exports = AWSResource;
