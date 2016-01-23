var _ = require('lodash')
    , utils = require('../utils')
    , fs = require('fs');

function endsWith(str, substr) {
    return str.indexOf(substr) == str.length-substr.length;
}

var commandNames = _.map(_.filter(fs.readdirSync(__dirname), function(file) {
    return file.indexOf('.') !== 0 && file !== 'index.js';
}), function(name) {
    if (endsWith(name, '.js')) {
        return name.slice(0, name.length-3);
    }
    return name;
});

var commands = utils.zipObject(commandNames, _.map(commandNames, function(commandName) {
    var module = require('./' + commandName);
    module.commandName = commandName;
    return module;
}));

module.exports = commands;
