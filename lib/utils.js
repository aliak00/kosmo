var _ = require('lodash')
    , readline = require('readline')
    , util = require('util');

var Utils = {
    pbind: function(func, thisArg) {
        var argsToBind = Array.from(arguments).slice(2);
        return function() {
            var args = argsToBind.concat(Array.from(arguments));
            return new Promise(function(resolve, reject) {
                args = args.concat(function(err, result) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
                func.apply(thisArg, args);
            });
        };
    },

    pdefer: function() {
        var deferred = {};
        deferred.promise = new Promise((resolve, reject) => {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    },

    pdone: function(func, thisArg) {
        var args = Array.from(arguments).slice(2);

        var deferred = Utils.pdefer();
        function doneCallback(err, value) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(value);
            }
        }

        var possiblePromise = func.apply(thisArg, args.concat([doneCallback]));
        if (possiblePromise) {
            return possiblePromise;
        }

        return deferred.promise;
    },

    zipObject: function(list, values) {
        return _.reduce(list, function(memo, v, i) {
            if (values) {
                memo[v] = values[i];
            } else {
                memo[list[i][0]] = list[i][1];
            }
            return memo;
        }, {});
    },

    yesorno: function(text) {
        return new Promise(function(resolve/*, reject*/) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.question(util.format('%s (yes|no): ', text), (answer) => {
                rl.close();
                if (answer === 'yes') {
                    return resolve(true);
                }
                resolve(false);
            });
        });
    },

};

module.exports = Utils;
