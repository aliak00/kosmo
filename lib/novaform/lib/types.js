'use strict';

var _ = require('lodash')
    , CloudFormationFunction = require('./cloud-formation-function')
    , AWSResource = require('./aws-resource');

function ensureValueValid(type, x) {
    const result = type.validate(x);
    if (result) {
        throw Error(`toCloudFormationValue received invalid value: ${result}`);
    }
}

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

const Types = {
    ensureValueValid: ensureValueValid,

    ref: function(resourceType) { //eslint-disable-line no-unused-vars
        return {
            name: 'ref',
            // TODO: test that resourceType is correct as well.
            validate: function(x) {
                if (!(x instanceof CloudFormationFunction.ref)
                    && !(x instanceof AWSResource)) {
                    return 'expected AWSResource or CloudFormationFunction.ref';
                }
            },
            toCloudFormationValue: function(x) {
                Types.ensureValueValid(this, x);
                if (x instanceof AWSResource) {
                    return CloudFormationFunction.ref(x);
                }
                return x;
            },
        };
    },

    string: {
        name: 'string',
        validate: function(x) {
            if (typeof x !== 'string'
                && !(x instanceof AWSResource)
                && !(x instanceof CloudFormationFunction.Base)) {
                return 'expected string, AWSResource or CloudFormationFunction';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            if (x instanceof AWSResource) {
                return CloudFormationFunction.ref(x);
            }
            return x;
        },
    },

    regex: {
        name: 'regex',
        validate: function(x) {
            if (!(x instanceof RegExp)) {
                return 'expected RegExp';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            return x.source;
        },
    },

    boolean: {
        name: 'boolean',
        validate: function(x) {
            if (typeof x !== 'boolean') {
                return 'expected boolean';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            return x.toString();
        },
    },

    enum: function() {
        var values = Array.prototype.slice.call(arguments);
        _.forEach(values, v => {
            if (typeof v !== 'string') {
                throw new Error('Enum values can only be strings.');
            }
        });
        return {
            name: 'enum',
            validate: function(x) {
                if (typeof x !== 'string') {
                    return 'expected string';
                }
                if (values.indexOf(x) === -1) {
                    return `expected one of ${values.join(',')}`;
                }
            },
            toCloudFormationValue: function(x) {
                Types.ensureValueValid(this, x);
                return x;
            },
        };
    },

    range: function(from, to) {
        return {
            name: 'range',
            validate: function(x) {
                if (typeof x !== 'number') {
                    return 'expected number';
                }
                if (!(x >= from && x <= to)) {
                    return `expected in range [${from}, ${to}]`;
                }
            },
            toCloudFormationValue: function(x) {
                Types.ensureValueValid(this, x);
                return x.toString();
            },
        };
    },

    number: {
        name: 'number',
        validate: function(x) {
            if (typeof x !== 'number') {
                return 'expected number';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            return x.toString();
        },
    },

    cidr: {
        name: 'cidr',
        validate: function(x) {
            if (typeof x !== 'string') {
                return 'expected string';
            }

            const ok = new RegExp(
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

            if (!ok) {
                return 'expected format x.x.x.x/x';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
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
            if (typeof x !== 'number' && typeof x !== 'string') {
                return 'expected string or number';
            }
            if (typeof x === 'number' && !(x in this.numberToNameMap)) {
                return 'expected valid protocol number';
            }
            if (typeof x === 'string' && !(x.toLowerCase() in this.nameToNumberMap)) {
                return 'expected valid protocol name';
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
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
                return 'expected object';
            }

            try {
                _.forEach(x, tagValue => {
                    var tagData = this.getValueAndOptions(tagValue);

                    if (typeof tagData.value !== 'string' &&
                        !(tagData.value instanceof AWSResource) &&
                        !(tagData.value instanceof CloudFormationFunction.Base)) {
                        throw 'expected instance of string, AWSResource, or CloudFormationFunction';
                    }

                    _.forEach(tagData.options, (optionValue, optionName) => {
                        if (!(optionName in this.validOptions)) {
                            throw optionName + ' invalid';
                        }
                        const expectedType = this.validOptions[optionName];
                        if (typeof optionValue !== expectedType) {
                            throw `expected ${optionName} to be type ${expectedType}`;
                        }
                    });
                });
            } catch (e) {
                return e;
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
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
                return 'expected array';
            }

            if (x.length !== 2) {
                return 'expected array length 2';
            }

            if (x[0] > x[1]) {
                return 'expected a[0] <= a[1]';
            }

            if (!_.every(x, p => _.isNumber(p) && p > 0 && p <= 65535)) {
                return `expected ${x} in range [1, 65535]`;
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            return {
                From: x[0].toString(),
                To: x[1].toString(),
            };
        },
    },

    jsonobject: {
        name: 'jsonobject',
        validate: function(x) {
            if (typeof x !== 'object'&& typeof x !== 'string') {
                return 'expected object or string';
            }
            if (typeof x === 'string') {
                try {
                    JSON.parse(x);
                } catch (e) {
                    return 'failed to parse string: ' + e;
                }
            }
        },
        toCloudFormationValue: function(x) {
            Types.ensureValueValid(this, x);
            if (typeof x === 'string') {
                return JSON.parse(x);
            }
            return x;
        },
    },

    emptymap: {
        name: 'emptymap',
        validate: function(x) {
            if (!_.isObject(x) || _.isArray(x)) {
                return 'expected non array object';
            }
            if (!_.isEmpty(x)) {
                return 'expected empty object';
            }
        },
        toCloudFormationValue(x) {
            Types.ensureValueValid(this, x);
            return {};
        },
    },

    object: function(typeName, propertyDefinitions) {
        if (typeof typeName !== 'string') {
            throw new Error('Object must have typeName.');
        }

        _.forEach(propertyDefinitions, p => {
            if (!p.type) {
                throw new Error(`Properties for type object "${typeName}" missing type definition.`);
            }
        });

        // TODO: Make sure 'required' is only either true or 'conditional'
        const mandatoryPropertyNames = _.reduce(propertyDefinitions, (m, v, k) => {
            if (v.required === true) {
                m.push(k);
            }
            return m;
        }, []);

        return {
            name: typeName,
            validate: function(x, parentType) {
                // If validate is not being called recursively, we want to prefix the error
                // message with the typeName
                const errorPrefix = parentType
                    ? ''
                    : `in ${typeName} `;

                var errors = [];
                if (typeof x !== 'object') {
                    return `${errorPrefix}expected object`;
                }

                if (!propertyDefinitions) {
                    return;
                }

                const propertyNames = _.keys(x);
                const diffKeys = _.difference(propertyNames, _.keys(propertyDefinitions));
                if (diffKeys.length > 0) {
                    errors.push(`${errorPrefix}unexpected propert${diffKeys.length > 1 ? 'ies' : 'y'} ${diffKeys.join(', ')}`);
                }

                const diffMandatoryKeys = _.difference(mandatoryPropertyNames, propertyNames);
                if (diffMandatoryKeys.length > 0) {
                    errors.push([
                        `${errorPrefix}missing mandatory propert${diffMandatoryKeys.length > 1 ? 'ies' : 'y'} `,
                        `${diffMandatoryKeys.join(', ')}`,
                    ].join(''));
                }

                _.forEach(x, (propertyValue, propertyName) => {
                    const propertyDefinition = propertyDefinitions[propertyName];
                    if (!propertyDefinition) {
                        return;
                    }
                    var typeValidationResult = propertyDefinition.type.validate(propertyValue, this);
                    if (!_.isUndefined(typeValidationResult)) {
                        typeValidationResult = typeValidationResult instanceof Array
                            ? typeValidationResult
                            : [typeValidationResult];
                        errors = errors.concat(_.map(typeValidationResult, result => {
                            return `in ${typeName}.${propertyName} ${result}`;
                        }));
                    }

                    if (propertyDefinition.validators instanceof Array) {
                        _.forEach(propertyDefinition.validators, validator => {
                            var propertyValidationResult = validator(x);
                            if (!_.isUndefined(propertyValidationResult)) {
                                errors.push(`in ${typeName}.${propertyName} validation failed with "${propertyValidationResult}"`);
                            }
                        });
                    }
                });

                if (!_.isEmpty(errors)) {
                    return errors;
                }
            },
            toCloudFormationValue: function(x) {
                Types.ensureValueValid(this, x);
                if (!propertyDefinitions) {
                    return x;
                }
                return _.mapValues(x, (value, key) => {
                    var type = propertyDefinitions[key].type;
                    return type.toCloudFormationValue(value);
                });
            },
        };
    },

    array: function(type) {
        return {
            name: 'array',
            validate: function(x) {
                var errors = [];
                if (!_.isArray(x)) {
                    return 'expected array';
                }
                _.forEach(x, (value, i) => {
                    const result = type.validate(value);
                    if (!_.isUndefined(result)) {
                        errors.push(`in [${i}] ${result}`);
                    }
                });

                if (!_.isEmpty(errors)) {
                    return errors;
                }
            },
            toCloudFormationValue: function(x) {
                Types.ensureValueValid(this, x);
                return _.map(x, v => {
                    return type.toCloudFormationValue(v);
                });
            },
        };
    },

    // TODO: make an arn type
};

module.exports = Types;
