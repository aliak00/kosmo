var _ = require('lodash');

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
        }
    },
};

module.exports = Utils;
