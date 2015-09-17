var EBApp = require('../templates/ebapp')
    , EBOptionsSettings = require('../utils/eb-option-settings')
    , novaform = require('novaform');

function EBWorker(options) {
    if (!(this instanceof EBWorker)) {
        return new EBWorker(options);
    }

    EBApp.call(this, options);

    this.environment.properties.Tier = {
        Name: 'Worker',
        Type: 'SQS/HTTP',
    };

    // Instead of setting it in the ConfigTemplate, we set this on the env
    // directly, because aws bug.
    this.environment.properties.OptionSettings = EBOptionsSettings({
        'aws:elasticbeanstalk:sqsd': {
            WorkerQueueURL: options.sqsUrl,
            HttpPath: options.httpPath,
        },
    });
}
EBWorker.prototype = Object.create(EBApp.prototype);

module.exports = EBWorker;
