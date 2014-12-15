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