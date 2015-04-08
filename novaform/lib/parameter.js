var _ = require('underscore')
    , types = require('./types')
    , util = require('util');

function Parameter(name, type_or_properties, properties) {
    if (!(this instanceof Parameter)) {
        return new Parameter(name, type_or_properties, properties);
    }

    if (!name) {
        throw new Error('name cannot be null');
    }

    var type = type_or_properties;

    // User can pass properties directly which might have Type inside.
    if (typeof type_or_properties !== 'string') {
        if (properties) {
            throw new Error('If second argument is object then there\'s no need for a third argument');
        }
        properties = type_or_properties;
        type = properties.Type;
    }

    if (!type) {
        throw new Error('Type must be specified as second argument or as key inside properties object')
    }

    this.properties = _.extend(properties, {
        Type: type
    });

    var propdefs = {
        Type: { type: types.enum(
            'String',
            'Number',
            'List<Number>',
            'CommaDelimitedList',
            'AWS::EC2::KeyPair::KeyName',
            'AWS::EC2::SecurityGroup::Id',
            'AWS::EC2::Subnet::Id',
            'AWS::EC2::VPC::Id',
            'List<AWS::EC2::VPC::Id>',
            'List<AWS::EC2::SecurityGroup::Id>',
            'List<AWS::EC2::Subnet::Id>'
        ) },
        Default: { type: types.string },
        NoEcho: { type: types.boolean },
        AllowedValues: { type: types.array },
        AllowedPattern: { type: types.regex },
        MaxLength: { type: types.number },
        MinLength: { type: types.number },
        MaxValue: { type: types.number },
        MinValue: { type: types.number },
        Description: { type: types.string },
        ConstraintDescription: { type: types.string }
    };

    _.forEach(this.properties, function(value, key) {
        var propdefAttributes = propdefs[key];
        if (!propdefAttributes) {
            throw new Error(util.format('Invalid parameter property %s', key));
        }

        if (!propdefAttributes.type.validate(value)) {
            throw new Error(util.format('Parameter property %s has invalid value %s. Expected type %s',
                key,
                value,
                propdefAttributes.type.name
            ));
        }
    })

    this.name = name;
    this.properties = properties;
}

Parameter.prototype.toObject = function() {
    return this.properties;
}

module.exports = Parameter;
