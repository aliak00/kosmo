var _ = require('lodash')
    , promiseUtils = require('./promise-utils')
    , stringizePathValues = require('./stringize-path-values')
    , yesorno = require('./yesorno')
    , zipObject = require('./zip-object');

module.exports = _.extend({
    stringizePathValues: stringizePathValues,
    yesorno: yesorno,
    zipObject: zipObject,
}, promiseUtils);
