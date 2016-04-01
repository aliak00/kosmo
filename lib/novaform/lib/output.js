var AWSResource = require('./aws-resource')
    , CloudFormationFunction = require('./cloud-formation-function')
    , util = require('util');

function Output(name, value, description) {
    if (!(this instanceof Output)) {
        return new Output(name, value, description);
    }

    if (!(value instanceof AWSResource) && !(value instanceof CloudFormationFunction.Base) && !(typeof value === 'string')) {
        var msg = util.format('Output "%s" value can only be a string or another resource or a join, getatt or an other function. '+
            'Got "%s" instead ("%s")', name, typeof value, value);
        throw new Error(msg);
    }
    if (description && !(typeof description !== 'string')) {
        throw new Error('Output description must be string');
    }

    this.name = name;
    this.value = value;
    this.description = description;
}

Output.prototype.toObject = function() {
    var value = this.value;
    if (value instanceof AWSResource) {
        value = CloudFormationFunction.ref(value);
    }

    return {
        Value : value,
        Description : this.description,
    };
};

module.exports = Output;
