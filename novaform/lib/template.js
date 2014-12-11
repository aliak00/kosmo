var Resource = require('./resource')
    , Output = require('./output');

function Template() {
    if (!(this instanceof Template)) {
        return new Template();
    }

    var resources = [];
    var outputs = [];

    function addResource(resource) {
        if (!(resource instanceof Resource)) {
            throw new Error('Not a Resource: ' + resource);
        }
        resources.push(resource);
    }

    function addOutput(output) {
        if (!(output instanceof Output)) {
            throw new Error('Not a Output: ' + output);
        }
        outputs.push(output);
    }

    function toJson() {
        var cft = {};

        resources.forEach(function(resource) {
            cft.Resources = cft.Resources || {};

            if (cft.Resources[resource.name]) {
                throw new Error('Found duplicate resource name: ' + resource.name);
            }

            cft.Resources[resource.name] = resource.toObject();
        });

        outputs.forEach(function(output) {
            cft.Outputs = cft.Outputs || {};

            if (cft.Outputs[output.name]) {
                throw new Error('Found duplicate output name: ' + output.name);
            }

            cft.Outputs[output.name] = output.toObject();
        });

        return JSON.stringify(cft, function(key, value) {
            if (typeof value === 'boolean') {
                return value.toString();
            }

            if (typeof value === 'number') {
                return value.toString();
            }

            if (value instanceof Resource) {
                return { Ref: value.name };
            }

            return value;
        }, 2);
    }

    return {
        addResource: addResource,
        addOutput: addOutput,
        toJson: toJson
    };
}

module.exports = Template;
