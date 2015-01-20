var Resource = require('./resource');

function Function() {
    if (!(this instanceof Function)) {
        return new Function();
    }
}

function Ref(resource) {
    if (!(this instanceof Ref)) {
        return new Ref(resource);
    }

    Function.call(this);

    if (resource instanceof Resource) {
        this.Ref = resource.name;
    } else {
        this.Ref = resource;
    }
}
Ref.prototype = Object.create(Function.prototype);

function Join(separator, values) {
    if (!(this instanceof Join)) {
        return new Join(separator, values);
    }

    Function.call(this);

    var modifiedValues = [];
    values.forEach(function(value) {
        if (value instanceof Resource) {
            modifiedValues.push(Ref(value));
        } else {
            modifiedValues.push(value);
        }
    });

    this['Fn::Join'] = [
        separator,
        modifiedValues
    ];
}
Join.prototype = Object.create(Function.prototype);

function Base64(data) {
    if (!(this instanceof Base64)) {
        return new Base64(data);
    }

    Function.call(this);

    this['Fn::Base64'] = data;
}
Base64.prototype = Object.create(Function.prototype);

function GetAtt(id, attr) {
    if (!(this instanceof GetAtt)) {
        return new GetAtt(id, attr);
    }

    Function.call(this);

    this['Fn::GetAtt'] = [
        id,
        attr
    ];
}
GetAtt.prototype = Object.create(Function.prototype);

module.exports = {
    Function: Function,
    ref: Ref,
    join: Join,
    base64: Base64,
    getAtt: GetAtt
};