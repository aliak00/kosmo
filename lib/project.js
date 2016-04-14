var _ = require('lodash')
    , fs = require('fs')
    , kosmoform = require('./kosmoform')
    , kosmostl = require('./kosmostl')
    , KosmoError = require('./kosmo-error')
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
            form: kosmoform,
            stl: kosmostl,
        });
    } catch (e) {
        throw new Error(`Failed to load project ${this.name}: ${e.message}`);
    }

    var requiredKosmoVersion = this.def.kosmoVersion;
    var actualKosmoVersion = program.getVersion();

    if (!requiredKosmoVersion) {
        throw new KosmoError(
'\
You seem to be using an old kosmo version that is incompatible with your definition file.\
\nEither downgrade kosmo to a crappier version or redo your definition file.\
'       );
    }

    if (!semver.satisfies(actualKosmoVersion, requiredKosmoVersion)) {
        throw new KosmoError('Kosmo binary incompatible with kosmo project: '
            + this.name
            + `. Required version: ${requiredKosmoVersion}, kosmo version: ${actualKosmoVersion}`);
    }

    _.forEach(this.def.components, component => {
        if (!component.name) {
            throw new KosmoError('Found component without a name. WHY YOU NO NAME COMPONENT!!??');
        }

        if (component.dependencies) {
            var dependencies = component.dependencies;
            if (!_.isObject(dependencies) || _.isArray(dependencies)) {
                throw new KosmoError(`Expected '${component.name}' dependencies to be an object.`);
            }

            if (dependencies.components && !_.isArray(dependencies.components)) {
                throw new KosmoError(`Expected '${component.name}' dependencies components to be an array.`);
            }

            if (dependencies.artifacts && !_.isArray(dependencies.artifacts)) {
                throw new KosmoError(`Expected '${component.name}' dependencies artifacts to be an array.`);
            }

            var extraKeys = _.difference(_.keys(dependencies), ['artifacts', 'components']);
            if (extraKeys.length !== 0) {
                throw new KosmoError(`Found unexpected nonsense inside '${component.name}' dependencies object: ${extraKeys.join(',')}`);
            }
        }
    });
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
