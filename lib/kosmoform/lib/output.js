var _ = require('lodash')
    , types = require('./types');

const outputType = types.object('Output', {
    Value: { type: types.string, required: true },
    Description: { type: types.string },
});

function Output(name, value, description) {
    if (!(this instanceof Output)) {
        return new Output(name, value, description);
    }

    this.name = name;
    this.properties = {
        Value: value,
    };
    if (description) {
        this.properties.Description = description;
    }
}

Output.prototype.validate = function() {
    var errors = [];

    var outputName = this.name;
    if (_.isEmpty(this.name) || !_.isString(this.name)) {
        errors.push('output name must be non-empty string');
        outputName = '<unknown>';
    }

    const typeValidationErrors = outputType.validate(this.properties);
    if (!_.isUndefined(typeValidationErrors)) {
        errors = errors.concat(_.map(typeValidationErrors, error => {
            return `output "${outputName}": ${error}`;
        }));
    }

    return { errors, warnings: [] };
};

Output.prototype.toObject = function() {
    return outputType.toCloudFormationValue(this.properties);
};

module.exports = Output;
