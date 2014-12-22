var Resource = require('./resource');

function ref(ref) {
    if (ref instanceof Resource) {
        return {Ref: ref.name}
    }
    return {Ref: ref}
}

function join(seperator, values) {
    var modifiedValues = [];
    values.forEach(function(value) {
        if (value instanceof Resource) {
            modifiedValues.push(ref(value));
        } else {
            modifiedValues.push(value);
        }
    });
    return {
        'Fn::Join': [
            seperator,
            modifiedValues
        ]
    };
}

function base64(data) {
    return {
        'Fn::Base64': data
    };
}

function getAtt(id, attr) {
    return {
        'Fn::GetAtt': [
            id,
            attr
        ]
    };
}

module.exports = {
    ref: ref,
    join: join,
    base64: base64,
    getAtt: getAtt
};