var _ = require('lodash')
    , promiseUtils = require('./lib/promise-utils')
    , stringizePathValues = require('./lib/stringize-path-values')
    , yesorno = require('./lib/yesorno')
    , zipObject = require('./lib/zip-object');

module.exports = _.extend({
    stringizePathValues: stringizePathValues,
    yesorno: yesorno,
    zipObject: zipObject,
}, promiseUtils);
