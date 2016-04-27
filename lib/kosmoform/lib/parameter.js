var _ = require('lodash')
    , types = require('./types')
    , CFFunction = require('./cf-function');

var parameterType = types.object('Parameter', {
    Type: {
        type: types.enum(
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
            'List<AWS::EC2::Subnet::Id>'),
        required: true,
    },
    Default: { type: types.string },
    NoEcho: { type: types.boolean },
    AllowedValues: { type: types.array },
    AllowedPattern: { type: types.regex },
    MaxLength: { type: types.number },
    MinLength: { type: types.number },
    MaxValue: { type: types.number },
    MinValue: { type: types.number },
    Description: { type: types.string },
    ConstraintDescription: { type: types.string },
});

function Parameter(name, typeOrProperties, properties) {
    if (!(this instanceof Parameter)) {
        return new Parameter(name, typeOrProperties, properties);
    }

    properties = typeof typeOrProperties === 'object' ? typeOrProperties : properties || {};
    const type = typeof typeOrProperties === 'string' ? typeOrProperties : properties.Type;

    if (type) {
        properties.Type = type;
    }

    this.name = name;
    this.properties = properties;

    this[CFFunction.REF] = this.name;
}

Parameter.prototype.validate = function() {
    var errors = [];

    var parameterName = this.name;
    if (_.isEmpty(this.name) || !_.isString(this.name)) {
        errors.push('parameter name must be non-empty string');
        parameterName = '<unknown>';
    }

    const typeValidationErrors = parameterType.validate(this.properties);
    if (!_.isUndefined(typeValidationErrors)) {
        errors = errors.concat(_.map(typeValidationErrors, error => {
            return `parameter "${parameterName}": ${error}`;
        }));
    }

    return { errors, warnings: [] };
};

Parameter.prototype.toObject = function() {
    return parameterType.toCloudFormationValue(this.properties);
};

module.exports = Parameter;
