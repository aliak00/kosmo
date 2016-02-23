var _ = require('lodash')
    , util = require('util');

function AWSResource(type, propdefinitions, name, properties, attributes, validator) {
    if (!(this instanceof AWSResource)) {
        return new AWSResource(type, propdefinitions, name, properties, attributes, validator);
    }

    this.type = type;
    this.name = name;
    this.properties = properties;
    this.propdefinitions = propdefinitions;
    this.attributes = attributes;
    this.validator = validator;
}

function ValidationError() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = 'ValidationError';

    this.stack = tmp.stack;
    this.message = tmp.message;
}
var IntermediateInheritor = function() {};
IntermediateInheritor.prototype = Error.prototype;
ValidationError.prototype = new IntermediateInheritor();

AWSResource.ValidationError = ValidationError;

AWSResource.prototype.validate = function() {
    var errors = [];
    var propdefinitions = this.propdefinitions;

    if (!this.name) {
        errors.push('You can\'t leave out the resource name ya ninny');
    }

    var diffKeys = _.difference(_.keys(this.properties), _.keys(propdefinitions));
    if (diffKeys.length > 0) {
        errors.push('Found unknown properties: ' + diffKeys.join(', '));
    }

    var mandatoryPropertyNames = _.reduce(propdefinitions, function(memo, value, key) {
        if (value.required === true) {
            memo.push(key);
        }
        return memo;
    }, []);
    var self = this;

    // check if mandatory properties are set
    mandatoryPropertyNames.forEach(function(propname) {
        var propvalue = self.properties[propname];
        if (typeof propvalue === 'undefined') {
            errors.push(util.format('Mandatory property "%s" is not set', propname));
        }
    });

    if (typeof this.validator === 'function') {
        var result = this.validator(this.properties);
        if (typeof result !== 'undefined') {
            errors.push(util.format('Failed validation: "%s"', result));
        }
    }

    var propertyNames = _.keys(this.properties);
    propertyNames.forEach(function(propname) {
        var propvalue = self.properties[propname];
        var def = propdefinitions[propname] || {};
        var type = def.type;
        if (typeof type === 'undefined') {
            errors.push(util.format('Internal error, missing type for property "%s"', propname));
            return;
        }
        if (typeof propvalue === 'undefined' && !def.required) {
            return;
        }
        if (!type.validate(propvalue)) {
            var value = propvalue;
            if (typeof propvalue === 'object') {
                value = JSON.stringify(propvalue);
            }
            errors.push(util.format(
                'Invalid value for "%s" should be of type "%s" got "%s"',
                    propname,
                    type.name,
                    value));
        }
        if (def.validators instanceof Array) {
            _.forEach(def.validators, function(validator) {
                var result = validator(self);
                if (typeof result !== 'undefined') {
                    errors.push(util.format('Value for "%s" failed validation: "%s"', propname, result));
                }
            });
        }
    });

    return errors;
};

// TODO: rename to "toCloudFormationTemplate"
AWSResource.prototype.toObject = function() {
    var errors = this.validate();
    if (errors.length) {
        console.log('Errors: resource (%s):', this.name);
        _.forEach(errors, function(error, index) {
            console.log('  ' + index + ') ' + error);
        });
        throw new AWSResource.ValidationError();
    }

    var propdefinitions = this.propdefinitions;
    var properties = _.mapValues(this.properties, function(value, key) {
        var def = propdefinitions[key] || {};
        if (def.type && def.type.toCloudFormationValue) {
            return def.type.toCloudFormationValue(value);
        }
        return value;
    });

    var object = {
        Type: this.type,
        Properties: properties,
    };

    object = _.extend(object, this.attributes);

    return object;
};

AWSResource.define = function(type, propdefinitions, options) {
    function Resource(name, properties, attributes) {
        if (!(this instanceof Resource)) {
            return new Resource(name, properties, attributes);
        }
        options = options || {};
        var validator = typeof options.validator === 'function' ? options.validator : null;
        AWSResource.call(this, type, propdefinitions, name, properties, attributes, validator);
    }
    Resource.prototype = Object.create(AWSResource.prototype);
    Resource.prototype.constructor = Resource;

    return Resource;
};

module.exports = AWSResource;
