var assert = require('assert');

function Ref(project, component) {
    if (!(this instanceof Ref)) {
        return new Ref(project, component);
    }

    this.project = project;
    this.component = component;
}

Ref.parse = function(ref) {
    var project;
    var component;

    if (typeof ref !== 'string') {
        return undefined;
    }
    var l = ref.split('/');
    if (l.length > 2) {
        return undefined;
    }
    project = l[0];
    component = l[1];

    return new Ref(project, component);
}

Ref.prototype.makeStackName = function() {
    assert(this.project);
    assert(this.component);

    var project = this.project[0].toUpperCase() + this.project.substr(1).toLowerCase();
    var component = this.component[0].toUpperCase() + this.component.substr(1).toLowerCase();

    return project + component;
};

module.exports = Ref;
