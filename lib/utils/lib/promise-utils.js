function pbind(func, thisArg) {
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
}

function pdefer() {
    var deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
}

function pdone(func, thisArg) {
    var args = Array.from(arguments).slice(2);

    var deferred = pdefer();
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
}

module.exports = {
    pbind: pbind,
    pdefer: pdefer,
    pdone: pdone,
};
