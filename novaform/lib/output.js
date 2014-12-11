var _ = require('underscore');

function Output(name, options) {
    if (!(this instanceof Output)) {
        return new Output(name, options);
    }

    this.name = name;
    this.options = options;
}

Output.prototype.toObject = function() {
    return this.options;
}

module.exports = Output;