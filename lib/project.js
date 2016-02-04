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

Project.prototype.load = function(lib) {
    try {
        this.def = this.module({
            params: program.params,
            lib: lib,
            form: novaform,
            stl: novastl,
        });
    } catch (e) {
        throw new Error(`Failed to load project ${this.name}: ${e.message}`);
    }
}

Project.prototype.components = function() {
    return _.map(this.def.components, 'name') || [];
}

Project.prototype.artifacts = function() {
    return _.map(this.def.artifacts, 'name') || [];
}

Project.prototype.findComponent = function(name) {
    return _.find(this.def.components, { name : name });
}

Project.prototype.findArtifact = function(name) {
    return _.find(this.def.artifacts, { name : name });
}

function walkDeps(project, result, componentName, walked) {
    if (!walked) {
        walked = [];
    }
    if (walked.indexOf(componentName) !== -1) {
        throw new Error('recursive dependency');
    }

    walked.push(componentName);

    var component = project.findComponent(componentName);
    if (!component) {
        throw new Error(util.format('Could not find dependent component "%s"', componentName));
    }
    var deps = _.map(component.dependencies, function(depname) {
        var w = walked ? walked.slice() : [];
        return walkDeps(project, [depname], depname, w);
    });

    deps.sort(function(a, b) { return a.length - b.length; });

    deps.forEach(function(deps) {
        deps.reverse();
        deps.forEach(function(d) {
            var idx = result.indexOf(d);
            if (idx !== -1) {
                result.splice(idx, 1);
            }
            result.unshift(d);
        });
    });

    return result;
}

Project.prototype.getComponentDependencies = function(componentName) {
    return walkDeps(this, [], componentName)
}

module.exports = Project;
