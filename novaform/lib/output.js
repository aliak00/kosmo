var _ = require('underscore');

function Output(name, valueOrOptions) {
    if (!(this instanceof Output)) {
        return new Output(name, valueOrOptions);
    }

    var options = (typeof valueOrOptions === 'object' && 'Value' in valueOrOptions) ? valueOrOptions : { Value : valueOrOptions };

    this.name = name;
    this.options = options;
}

Output.prototype.toObject = function() {
    return this.options;
}

module.exports = Output;
