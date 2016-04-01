'use strict';

var _ = require('lodash')
    , CloudFormationFunction = require('./cloud-formation-function')
    , AWSResource = require('./aws-resource');

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
            return x.toString();
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
            validate: function(x) { return values.indexOf(x) !== -1; },
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
    },

    cidr: {
        name: 'CIDR',
        validate: function(x) { return typeof x === 'string'; /* TODO: also check value format */},
    },

    protocol: {
        name: 'protocol',
        validate: function(x) {
            if (typeof x === 'number') {
                x = ''+x;
            }
            if (typeof x !== 'string') {
                return false;
            }

            if (x === '-1') {
                // meaning "allow all"
                return true;
            }

            var protocolNames = _.map(_.values(this.protocols), function(x) { return x.toLowerCase(); });
            var protocolNumberStrings = _.map(_.keys(this.protocols), function(x) { return ''+x; });

            // check valid protocol names and numbers
            return _.includes(protocolNumberStrings, x) || _.includes(protocolNames, x.toLowerCase());
        },
        valueAsNumber: function(x) {
            if (typeof x === 'number') {
                return x;
            }
            if (typeof x !== 'string') {
                return undefined;
            }
            var v = parseInt(x, 10);
            if (!_.isNaN(v)) {
                return v;
            }
            return _.findKey(this.protocols, function(name) {
                return name.toLowerCase() === x.toLowerCase();
            });
        },
        valueAsName: function(x) {
            if (typeof x !== 'number') {
                x = parseInt(x, 10);
            }

            return this.protocols[x];
        },
        toCloudFormationValue: function(x) {
            return this.valueAsNumber(x).toString();
        },

        protocols: {
            1: 'ICMP',
            4: 'IPv4',
            6: 'TCP',
            17: 'UDP',
        },
    },

    tags: {
        name: 'tags',
        validate: function(x) {
            if (typeof x !== 'object') {
                return false;
            }

            var self = this;

            return _.every(x, function(value, key) {
                if (typeof key !== 'string') {
                    return false;
                }

                var v = self.getValueAndOptions(value);

                if (typeof v.value !== 'string' &&
                    !(v.value instanceof AWSResource) &&
                    !(v.value instanceof CloudFormationFunction.Base)) {
                    return false;
                }

                // the only accepted option at the moment is 'PropagateAtLaunch'
                var valid = _.every(v.options, function(value, key) {
                    if (key === 'PropagateAtLaunch') {
                        return typeof value === 'boolean';
                    }
                    return false;
                });
                if (!valid) {
                    return false;
                }

                return true;
            });
        },
        getValueAndOptions: function(valueOrOptions) {
            var value = valueOrOptions;
            var options;

            if (typeof valueOrOptions === 'object' &&
                !(valueOrOptions instanceof AWSResource) &&
                !(valueOrOptions instanceof CloudFormationFunction.Base)) {
                value = valueOrOptions.Value;
                options = _.omit(valueOrOptions, 'Value');
            }

            return {
                value: value,
                options: options || {},
            };
        },
        toCloudFormationValue: function(x) {
            var self = this;
            return _.map(x, function(value, key) {
                var v = self.getValueAndOptions(value);
                return {
                    Key: key,
                    Value: v.value,
                    PropagateAtLaunch: v.options.PropagateAtLaunch,
                };
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

            function isValidPort(x) { return _.isNumber(x) && (x % 1 === 0); }

            return _.every(x, isValidPort);
        },
        toCloudFormationValue: function(x) {
            return {
                From: ''+x[0],
                To: ''+x[1],
            };
        },
    },

    icmp: {
        name: 'icmp',
        validate: function(x) {
            if (!_.isObject(x)) {
                return false;
            }
            var valid = _.every(x, function(value, key) {
                if (key === 'Code') {
                    return typeof _.isNumber(value);
                }
                if (key === 'Type') {
                    return typeof _.isNumber(value);
                }
                return false;
            });
            return valid;
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
