var _ = require('lodash')
    , fs = require('fs')
    , novaform = require('./novaform')
    , novastl = require('./novastl')
    , NovaError = require('./nova-error')
    , path = require('path')
    , program = require('./program')
    , ProjectRef = require('./project-ref')
    , semver = require('semver')
    , util = require('util');

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
        // Someday a line number might be useful :( https://bugs.chromium.org/p/v8/issues/detail?id=2589
        throw new Error(`Failed to require project ${name} - ${e}`);
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

    var requiredNovaVersion = this.def.novaVersion;
    var actualNovaVersion = program.getVersion();

    if (!requiredNovaVersion) {
        throw new NovaError(
'\
You seem to be using an old nova version that is incompatible with your definition file.\
\nEither downgrade nova to a crappier version or redo your definition file.\
'       );
    }

    if (!semver.satisfies(actualNovaVersion, requiredNovaVersion)) {
        throw new NovaError('Nova binary incompatible with nova project: '
            + this.name
            + `. Required version: ${requiredNovaVersion}, nova version: ${actualNovaVersion}`);
    }
};

Project.prototype.getComponents = function() {
    return _.map(this.def.components, 'name') || [];
};

Project.prototype.getArtifacts = function() {
    return _.map(this.def.artifacts, 'name') || [];
};

Project.makeFullRef = function(projectName, componentRef) {
    var ref = ProjectRef.parse(componentRef);
    return ref.subname ? componentRef : util.format('%s/%s', projectName, ref.name);
};

Project.prototype.getDependencies = function(comopnentName) {
    var componentDef = this.findComponent(comopnentName);
    var makeRefs = _.bind(Project.makeFullRef, Project, this.name);
    var componentDependencies = _.get(componentDef, 'dependencies.components', []);
    var artifactDependencies = _.get(componentDef, 'dependencies.artifacts', []);
    return {
        components: _.map(componentDependencies, makeRefs),
        artifacts: _.map(artifactDependencies, makeRefs),
    };
};

Project.prototype.findComponent = function(name) {
    return _.find(this.def.components, { name : name });
};

Project.prototype.findArtifact = function(name) {
    return _.find(this.def.artifacts, { name : name });
};

module.exports = Project;
