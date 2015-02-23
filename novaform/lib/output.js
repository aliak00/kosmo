var Resource = require('./resource')
    , AWSResource = require('./awsresource')
    , fn = require('./fn');

function Output(name, value, description) {
    if (!(this instanceof Output)) {
        return new Output(name, value, description);
    }

    if (!(value instanceof Resource) && !(value instanceof AWSResource) && !(value instanceof fn.Function) && !(typeof value === 'string')) {
        throw new Error('Output value can only be a string or another resource or a join, getatt or an other function');
    }
    if (description && !(typeof description !== 'string')) {
        throw new Error('Output description must be string');
    }

    this.name = name;
    this.value = value;
    this.description = description;
}

Output.prototype.toObject = function() {
    value = this.value;
    if (value instanceof AWSResource) {
        value = fn.ref(value);
    }

    return {
        Value : value,
        Description : this.description,
    };
}

module.exports = Output;
