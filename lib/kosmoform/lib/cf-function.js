var _ = require('lodash');

function CFFunction() {
    if (!(this instanceof CFFunction)) {
        return new CFFunction();
    }
}

// Any object that sets this symbol can determine what is used in the cloudformation value for Ref:
//
// var object = {[CFFunction.REF]: 'the-name' }
// CFFunction.Ref(object) => {Ref: 'the-name'}
//
CFFunction.REF = Symbol('CFFunction.REF');
CFFunction.GET_ATT = Symbol('CFFunction.GET_ATT');

function Ref(x) {
    if (!(this instanceof Ref)) {
        return new Ref(x);
    }

    CFFunction.call(this);

    if (x && _.isString(x[CFFunction.REF])) {
        this.Ref = x[CFFunction.REF];
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
        if (value && _.isString(value[CFFunction.REF])) {
            modifiedValues.push(Ref(value[CFFunction.REF]));
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
    if (id && _.isString(id[CFFunction.GET_ATT])) {
        name = id[CFFunction.GET_ATT];
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
