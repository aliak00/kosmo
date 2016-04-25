var _ = require('lodash')
    , AWSResource = require('./aws-resource')
    // , Parameter = require('./parameter');

function CFFunction() {
    if (!(this instanceof CFFunction)) {
        return new CFFunction();
    }
}

function Ref(x) {
    if (!(this instanceof Ref)) {
        return new Ref(x);
    }

    CFFunction.call(this);

    if (x instanceof AWSResource){//} || x instanceof Parameter) {
        this.Ref = x.name;
    } else {
        this.Ref = x;
    }
}
Ref.prototype = Object.create(CFFunction.prototype);

function Join(separator, values) {
    if (!(this instanceof Join)) {
        return new Join(separator, values);
    }

    CFFunction.call(this);

    const modifiedValues = [];
    _.forEach(values, value => {
        if (value instanceof AWSResource) {
            modifiedValues.push(Ref(value));
        } else {
            modifiedValues.push(value);
        }
    });

    this['Fn::Join'] = [
        separator,
        modifiedValues,
    ];
}
Join.prototype = Object.create(CFFunction.prototype);

function Base64(data) {
    if (!(this instanceof Base64)) {
        return new Base64(data);
    }

    CFFunction.call(this);

    this['Fn::Base64'] = data;
}
Base64.prototype = Object.create(CFFunction.prototype);

function GetAtt(id, attr) {
    if (!(this instanceof GetAtt)) {
        return new GetAtt(id, attr);
    }

    CFFunction.call(this);

    var name = id;
    if (id instanceof AWSResource) {
        name = id.name;
    }
    this['Fn::GetAtt'] = [
        name,
        attr,
    ];
}
GetAtt.prototype = Object.create(CFFunction.prototype);

function GetAZs(region) {
    if (!(this instanceof GetAZs)) {
        return new GetAZs(region);
    }

    CFFunction.call(this);

    this['Fn::GetAZs'] = region || '';
}
GetAZs.prototype = Object.create(CFFunction.prototype);

CFFunction.ref = Ref;
CFFunction.join = Join;
CFFunction.base64 = Base64;
CFFunction.getAtt = GetAtt;
CFFunction.getAZs = GetAZs;

module.exports = CFFunction;
