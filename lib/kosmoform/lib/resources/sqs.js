var AWSResource = require('../aws-resource')
    , types = require('../types');

var RedrivePolicyType = types.object('RedrivePolicy', {
    deadLetterTargetArn: { type: types.string },
    maxReceiveCount: { type: types.number },
});

var Queue = AWSResource.define('AWS::SQS::Queue', {
    DelaySeconds: { type: types.range(0, 900) },
    MaximumMessageSize: { type: types.range(1024, 262144) },
    MessageRetentionPeriod: { type: types.range(60, 1209600) },
    QueueName: { type: types.string },
    ReceiveMessageWaitTimeSeconds: { type: types.range(1, 20) },
    RedrivePolicy: { type: RedrivePolicyType },
    VisibilityTimeout: { type: types.range(0, 43200) },
}, {
    validator: function(context) {
        if (context.properties.QueueName) {
            context.addWarning('Warning: specifying QueueName (' + context.properties.QueueName + ') will disallow updates that require replacement.');
        }
    },
});

var QueuePolicy = AWSResource.define('AWS::SQS::QueuePolicy', {
    PolicyDocument: { type: types.jsonobject, required: true },
    Queues: { type: types.array(types.string), required: true },
});

module.exports = {
    Queue: Queue,
    QueuePolicy: QueuePolicy,
};
