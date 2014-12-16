var Template = require('./template')
    , Resource = require('./resource');

function Stack(name, description) {
    if (!(this instanceof Stack)) {
        return new Stack(name);
    }

    this.name = name;
    this.description = description;
    this.templates = [];
}

Stack.prototype.add = function(template) {
    if (!(template instanceof Template)) {
        throw new Error('template must be instanceof Template');
    }

    this.templates.push(template);
}

Stack.prototype.toJson = function() {
    var cft = Template();
    this.templates.forEach(function(template) {
        for (key in template.resources) {
            cft.addResource(template.resources[key]);
        }
        for (key in template.outputs) {
            cft.addOutput(template.outputs[key]);
        }
    });
    return cft.toJson(this.description);
}

module.exports = Stack;