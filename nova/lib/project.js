var fs = require('fs')
    , novautils = require('./component-utils')
    , novaform = require('novaform')
    , novastl = require('novastl')
    , _ = require('underscore');

function Project(config) {
    this.config = config;
}
Project.searchPaths = [process.cwd()];
Project.load = function(name, params, callback) {
    for (var i = 0; i < Project.searchPaths.length; ++i) {
        var searchPath = Project.searchPaths[i];
        var filepath = searchPath + '/' + name;

        if (fs.existsSync(filepath) || fs.existsSync(filepath + '.js')) {
            try {
                var module = require(filepath);
                var config = module({
                    utils: novautils,
                    resources: novaform,
                    templates: novastl,
                    params: params
                });
                return new Project(config);
            } catch (e) {
                if (callback) {
                    callback(e);
                }
            }
            return null;
        }
    }
    return null;
};
Project.prototype.findComponent = function(name) {
    var component = _.findWhere(this.config.components, { name : name })
    return component;
}

module.exports = Project;
