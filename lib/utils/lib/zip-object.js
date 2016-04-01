var _ = require('lodash');


// NOTE: This is only here because of an incomapability that was introduced in a lodash release
// that changed the behaviour of zipObject. Can remove after updating lodash over 4.0
function zipObject(list, values) {
    return _.reduce(list, function(memo, v, i) {
        if (values) {
            memo[v] = values[i];
        } else {
            memo[list[i][0]] = list[i][1];
        }
        return memo;
    }, {});
}

module.exports = zipObject;
