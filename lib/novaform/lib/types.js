'use strict';

var _ = require('lodash')
    , CloudFormationFunction = require('./cloud-formation-function')
    , AWSResource = require('./aws-resource');


const NUMBER_TO_NAME_MAP = {
    1: 'icmp',
    4: 'ipv4',
    6: 'tcp',
    17: 'udp',

    '-1': 'all',
};

function createProtocolNumberToNameMap() {
    return NUMBER_TO_NAME_MAP;
}

function createProtocolNameToNumberMap() {
    return _.reduce(NUMBER_TO_NAME_MAP, (m, v, k) => { m[v] = parseInt(k, 10); return m; }, {});
}

module.exports = {
    string: {
        name: 'string',
        validate: function(x) {
            if (typeof x === 'string') {
                return true;
            }

            // implicit ref
            if (x instanceof AWSResource) {
                return true;
            }

            if (x instanceof CloudFormationFunction.Base) {
                return true;
            }

            // TODO: allow manually created function objects

            return false;
        },
        toCloudFormationValue: function(x) {
            if (x instanceof AWSResource) {
                return CloudFormationFunction.ref(x);
            }
            return x;
        },
    },

    regex: {
        name: 'regex',
        validate: function(x) {
            if (x instanceof RegExp) {
                return true;
            }

            return false;
        },
        toCloudFormationValue: function(x) {
            return x.source;
        },
    },

    boolean: {
        name: 'boolean',
        validate: function(x) {
            return typeof x === 'boolean';
        },
        toCloudFormationValue: function(x) {
            return x.toString();
        },
    },

    enum: function() {
        var values = Array.prototype.slice.call(arguments);
        return {
            name: 'enum',
            validate: function(x) { return typeof x === 'string' && values.indexOf(x) !== -1; },
            toCloudFormationValue: function(x) {
                return x;
            },
        };
    },

    range: function(from, to) {
        return {
            name: 'range',
            validate: function(x) { return typeof x === 'number' && x >= from && x <= to; },
            toCloudFormationValue: function(x) {
                return x.toString();
            },
        };
    },

    number: {
        name: 'number',
        validate: function(x) { return typeof x === 'number'; },
        toCloudFormationValue: function(x) {
            return x.toString();
        },
    },

    cidr: {
        name: 'cidr',
        validate: function(x) {
            if (typeof x !== 'string') {
                return false;
            }

            return new RegExp(
                _.map(
                    [
                        /^/,
                        /(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}/,
                        /([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])/,
                        /(\/([0-9]|[1-2][0-9]|3[0-2]))/,
                        /$/,
                    ],
                    r => r.source
                ).join('')
            ).test(x);
        },
        toCloudFormationValue: function(x) {
            return x;
        },
    },

    protocol: {

        numberToNameMap: createProtocolNumberToNameMap(),

        nameToNumberMap: createProtocolNameToNumberMap(),

        valueAsName: function(x) {
            if (typeof x === 'number') {
                return this.numberToNameMap[x].toLowerCase();
            }
            return x.toLowerCase();
        },

        name: 'protocol',

        validate: function(x) {
            if (typeof x === 'number') {
                return x in this.numberToNameMap;
            }
            if (typeof x !== 'string') {
                return false;
            }

            return x.toLowerCase() in this.nameToNumberMap;
        },
        toCloudFormationValue: function(x) {
            if (typeof x === 'string') {
                x = this.nameToNumberMap[x.toLowerCase()];
            }
            return x.toString();
        },
    },

    tags: {

        validOptions: {
            'PropagateAtLaunch': 'boolean',
        },

        getValueAndOptions: function(valueOrOptions) {
            if (typeof valueOrOptions === 'object' &&
                !(valueOrOptions instanceof AWSResource) &&
                !(valueOrOptions instanceof CloudFormationFunction.Base)) {
                return {
                    value: valueOrOptions.Value,
                    options: _.omit(valueOrOptions, 'Value'),
                };
            }

            return {
                value: valueOrOptions,
                options: {},
            };
        },

        name: 'tags',

        validate: function(x) {
            if (typeof x !== 'object') {
                return false;
            }

            return _.every(x, (tagValue, tagName) => {
                if (typeof tagName !== 'string') {
                    return false;
                }

                var tagData = this.getValueAndOptions(tagValue);

                if (typeof tagData.value !== 'string' &&
                    !(tagData.value instanceof AWSResource) &&
                    !(tagData.value instanceof CloudFormationFunction.Base)) {
                    return false;
                }

                // the only accepted option at the moment is 'PropagateAtLaunch'
                return _.every(tagData.options, (optionValue, optionName) => {
                    return optionName in this.validOptions
                        && typeof optionValue === this.validOptions[optionName];
                });
            });
        },
        toCloudFormationValue: function(x) {
            return _.map(x, (tagValue, tagName) => {
                var tagData = this.getValueAndOptions(tagValue);
                return _.extend({
                    Key: tagName,
                    Value: tagData.value,
                }, _.reduce(tagData.options, (m, v, k) => {m[k] = v.toString(); return m; }, {}));
            });
        },
    },

    portrange: {
        name: 'portrange',
        validate: function(x) {
            if (!_.isArray(x)) {
                return false;
            }

            if (x.length !== 2) {
                return false;
            }

            if (x[0] > x[1]) {
                return false;
            }

            return _.every(x, p => _.isNumber(p) && p > 0 && p <= 65535);
        },
        toCloudFormationValue: function(x) {
            return {
                From: x[0].toString(),
                To: x[1].toString(),
            };
        },
    },

    object: function(name, properties) {
        return {
            name: name,
            validate: function(x) {
                if (typeof x !== 'object') {
                    return false;
                }
                if (!properties) {
                    return true;
                }
                return _.every(x, function(value, key) {
                    var type = properties[key];
                    if (type) {
                        return type.validate(value);
                    }
                    return false;
                });
            },
            toCloudFormationValue: function(x) {
                if (!properties) {
                    return x;
                }
                return _.mapValues(x, function(value, key) {
                    var type = properties[key];
                    if (type && type.toCloudFormationValue) {
                        return type.toCloudFormationValue(value);
                    }
                    return value;
                });
            },
        };
    },

    jsonobject: {
        name: 'jsonobject',
        validate: function(x) {
            if (typeof x === 'object') {
                return true;
            }

            if (typeof x !== 'string') {
                return false;
            }

            try {
                JSON.parse(x);
            } catch (e) {
                console.log('JSON.parse error:', e);
                return false;
            }

            return true;
        },
    },

    // TODO: make typed arrays
    array: {
        name: 'array',
        validate: function(/* x */) {
            return true;
        },
    },
};
