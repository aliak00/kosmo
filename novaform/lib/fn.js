var Resource = require('./resource');

function ref(ref) {
    if (ref instanceof Resource) {
        return {Ref: ref.name}
    }
    return {Ref: ref}
}

function join(seperator, values) {
    return {
        'Fn::Join': [
            seperator,
            values
        ]
    };
}

function base64(data) {
    return {
        'Fn::Base64': data
    };
}

function getAttr(id, attr) {
    return {
        'Fn::GetAttr': [
            id,
            attr
        ]
    };
}

module.exports = {
    ref: ref,
    join: join,
    base64: base64,
    getAttr: getAttr
};