var Resource = require('./resource')
    , AWSResource = require('./awsresource');

function jsonReplacer(key, value) {
    if (typeof value === 'boolean') {
        return value.toString();
    }

    if (typeof value === 'number') {
        return value.toString();
    }

    if (value instanceof Resource) {
        return { Ref: value.name };
    }

    if (value instanceof AWSResource) {
        return { Ref: value.name };
    }

    return value;
}

module.exports = {
    jsonReplacer: jsonReplacer
};
