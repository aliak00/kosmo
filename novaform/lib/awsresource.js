var _ = require('lodash')
    , util = require('util');

function AWSResource(type, propdefinitions, name, properties, attributes) {
    if (!(this instanceof AWSResource)) {
        return new AWSResource(type, propdefinitions, name, properties, attributes);
    }

    this.type = type;
    this.name = name;
    this.properties = properties;
    this.propdefinitions = propdefinitions;
    this.attributes = attributes;
    this.validator = null;
}

function ValidationError() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = 'ValidationError';

    this.stack = tmp.stack;
    this.message = tmp.message;
}
var IntermediateInheritor = function() {}
IntermediateInheritor.prototype = Error.prototype;
ValidationError.prototype = new IntermediateInheritor();

AWSResource.ValidationError = ValidationError;

AWSResource.prototype.setValidator = function(callback) {
    if (typeof callback !=='function') {
        throw new Error('Callback must be a function');
    }
    this.validator = callback;
}

AWSResource.prototype.validate = function() {
    var propdefinitions = this.propdefinitions;
    var mandatoryPropertyNames = _.reduce(propdefinitions, function(memo, value, key) {
        if (value.required === true) {
            memo.push(key);
        }
        return memo;
    }, []);

    var errors = [];
    var self = this;

    // check if mandatory properties are set
    mandatoryPropertyNames.forEach(function(propname) {
        var propvalue = self.properties[propname];
        if (typeof propvalue === 'undefined') {
            errors.push(util.format(
                    'Resource "%s": Mandatory property "%s" is not set',
                    self.name,
                    propname))
        }
    });

    if (typeof this.validator === 'function') {
        var result = this.validator(this.properties);
        if (typeof result !== 'undefined') {
            errors.push(util.format(
                    'Resource "%s" failed validation: "%s"',
                    self.name,
                    result));
            );
        }
    }

    var propertyNames = Object.keys(this.properties);
    propertyNames.forEach(function(propname) {
        var propvalue = self.properties[propname];
        var def = propdefinitions[propname] || {};
        var type = def.type;
        if (typeof type === 'undefined') {
            errors.push(util.format(
                    'Resource "%s": Internal error, missing type for property "%s"',
                    self.name,
                    propname));
            );
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
                    'Resource "%s": Invalid value for "%s" should be of type "%s" got "%s"',
                    self.name,
                    propname,
                    type.name,
                    value));
            );
        }
        if (def.validators instanceof Array) {
            _.forEach(def.validators, function(validator) {
                var result = validator(self);
                if (typeof result !== 'undefined') {
                    errors.push(util.format(
                            'Resource "%s": Value for "%s" failed validation: "%s"',
                            self.name,
                            propname,
                            result));
                    );
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
        console.log('Template errors:')
        _.forEach(errors, function(error) {
            console.log('  \n' + error);
        })
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

AWSResource.define = function(type, propdefinitions) {
    function Resource(name, properties, attributes) {
        if (!(this instanceof Resource)) {
            return new Resource(name, properties, attributes);
        }

        AWSResource.call(this, type, propdefinitions, name, properties, attributes);
    }
    Resource.prototype = Object.create(AWSResource.prototype);
    Resource.prototype.constructor = Resource;

    return Resource;
};

module.exports = AWSResource;
