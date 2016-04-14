'use strict';

var _ = require('lodash')
    , assert = require('assert');

function AWSResource(name, objectType, properties, attributes, validator) {
    if (!(this instanceof AWSResource)) {
        return new AWSResource(name, objectType, properties, attributes, validator);
    }

    // TODO: add a check that objectTyps is actually a type.object. Might need to
    // refactor types to have a base called Type or something so we can do something
    // like if (objectType instanceof types.Object), for eg.

    this.type = objectType;
    this.name = name;
    this.properties = properties || {};
    this.attributes = attributes;
    this.validator = validator;
}

AWSResource.prototype.validate = function() {
    var errors = [];
    var warnings = [];

    var resourceName = this.name;
    if (_.isEmpty(this.name) || !_.isString(this.name)) {
        errors.push('resource name must be non-empty string');
        resourceName = '<unknown>';
    }

    var typeValidationErrors = this.type.validate(this.properties);

    if (!_.isUndefined(typeValidationErrors)) {
        errors = errors.concat(_.map(typeValidationErrors, error => {
            return `resource "${resourceName}": ${error}`;
        }));
    }

    const validators = typeof this.validator === 'function'
        ? [this.validator]
        : this.validator instanceof Array
            ? this.validator
            : [];

    _.forEach(validators, validator => {
        assert(_.isFunction(validator));
        const validationContext = {
            addError: function(message) {
                errors.push(`resource "${resourceName}" validation error: "${message}"`);
            },
            addWarning: function(message) {
                warnings.push(`resource "${resourceName}" validation warning: "${message}"`);
            },
            properties: this.properties,
        };
        validator(validationContext);
    });

    return { errors, warnings };
};

AWSResource.prototype.toObject = function() {
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
        var validator = _.isFunction(options.validator) || _.isArray(options.validator)
            ? options.validator
            : undefined;
        AWSResource.call(this, name, types.object(typeName, propertyDefinitions), properties, attributes, validator);
    }
    Resource.prototype = Object.create(AWSResource.prototype);
    Resource.prototype.constructor = Resource;

    return Resource;
};

module.exports = AWSResource;
