var changeCase = require('change-case');

function Component(stackName) {
    if (!(this instanceof Component)) {
        return new Component(stackName);
    }

    this.stackName = stackName;
}

Component.makeStackName = function(projectName, componentName) {
    return changeCase.pascal(projectName + ' ' + componentName);
};

module.exports = Component;
