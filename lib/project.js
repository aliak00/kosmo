var fs = require('fs')
    , novaform = require('./novaform')
    , novastl = require('./novastl')
    , path = require('path')
    , program = require('./program')
    , _ = require('lodash');

Project.searchPaths = [process.cwd()];

function Project(name) {
    if (!(this instanceof Project)) {
        return new Project(name);
    }

    this.name = name;

    for (var i = 0; i < Project.searchPaths.length; ++i) {
        var searchPath = Project.searchPaths[i];
        var filepath = path.join(searchPath, this.name);
        if (fs.existsSync(filepath) || fs.existsSync(filepath + '.js')) {
            this.filepath = filepath;
            break;
        }
    }

    if (!this.filepath) {
        throw new Error(`Could not find project ${name} in ${Project.searchPaths}`);
    }

    try {
        this.module = require(this.filepath);
    } catch (e) {
        throw new Error(`Failed to require project ${name}: ${e.message}`);
    }
}

Project.prototype.load = function(utils) {
    try {
        this.def = this.module({
            resources: novaform,
            templates: novastl,
            params: program.params,
            utils: utils,
            form: novaform,
            stl: novastl,
        });
    } catch (e) {
        throw new Error(`Failed to load project ${this.name}: ${e.message}`);
    }
}

Project.prototype.findComponent = function(name) {
    return _.find(this.def.components, { name : name });
}

Project.prototype.findArtifact = function(name) {
    return _.find(this.def.artifacts, { name : name });
}

module.exports = Project;
