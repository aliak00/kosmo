var _ = require('lodash')
    , AWSResource = require('./aws-resource');

function Base() {
    if (!(this instanceof Base)) {
        return new Base();
    }
}

function Ref(resource) {
    if (!(this instanceof Ref)) {
        return new Ref(resource);
    }

    Base.call(this);

    if (resource instanceof AWSResource) {
        this.Ref = resource.name;
    } else {
        this.Ref = resource;
    }
}
Ref.prototype = Object.create(Base.prototype);

function Join(separator, values) {
    if (!(this instanceof Join)) {
        return new Join(separator, values);
    }

    Base.call(this);

    var modifiedValues = [];
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
Join.prototype = Object.create(Base.prototype);

function Base64(data) {
    if (!(this instanceof Base64)) {
        return new Base64(data);
    }

    Base.call(this);

    this['Fn::Base64'] = data;
}
Base64.prototype = Object.create(Base.prototype);

function GetAtt(id, attr) {
    if (!(this instanceof GetAtt)) {
        return new GetAtt(id, attr);
    }

    Base.call(this);

    var name = id;
    if (id instanceof AWSResource) {
        name = id.name;
    }
    this['Fn::GetAtt'] = [
        name,
        attr,
    ];
}
GetAtt.prototype = Object.create(Base.prototype);

function GetAZs(region) {
    if (!(this instanceof GetAZs)) {
        return new GetAZs(region);
    }

    Base.call(this);

    this['Fn::GetAZs'] = region || '';
}
GetAZs.prototype = Object.create(Base.prototype);

module.exports = {
    Base: Base,
    ref: Ref,
    join: Join,
    base64: Base64,
    getAtt: GetAtt,
    getAZs: GetAZs,
};
