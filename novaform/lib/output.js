var Resource = require('./resource');

function Output(name, value, description) {
    if (!(this instanceof Output)) {
        return new Output(name, value, description);
    }

    if (!(value instanceof Resource) && !(typeof value === 'string')) {
        throw new Error('Output value can only be a string or another resource');
    }
    if (description && !(typeof description !== 'string')) {
        throw new Error('Output description must be string');
    }

    this.name = name;
    this.value = value;
    this.description = description;
}

Output.prototype.toObject = function() {
    return {
        Value : this.value,
        Description : this.description,
    };
}

module.exports = Output;
