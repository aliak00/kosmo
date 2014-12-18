var getopt = require('node-getopt')
    , _ = require('underscore');

var cmdopts = module.exports.opts = getopt.create([
    ['w', 'wait', 'Wait for completion'],
    ['h', 'help', 'Display help']
]);

cmdopts.setHelp('[[OPTIONS]]\n');

function Command(commonOptions, args, helpCallback) {
    if (!(this instanceof Command)) {
        return new Command(name, properties);
    }

    var opts = this.opts = cmdopts.parse(args);

    if (opts.options.help) {
        helpCallback();
        return;
    }

    if (_(opts.argv).isEmpty()) {
        helpCallback('Missing project/component reference');
        return;
    } else if (opts.argv.length !== 1) {
        helpCallback('Too many project/component references specified');
        return;
    }

    var ref = opts.argv[0];
    this.ref = parseProjectRef(ref);
    if (!this.ref) {
        helpCallback('Invalid project ref');
        return;
    }
}

Command.prototype.execute = function() {
}

Command.usageText = '[options] <project>/<component>'
Command.descriptionText = 'Deploys project component';
Command.optionsText = cmdopts.getHelp();

module.exports = Command;

// helpers
// TODO: this should probably be shared in lib/shared ?

function parseProjectRef(ref) {
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

    return {
        project: project,
        component: component,
    };
}
