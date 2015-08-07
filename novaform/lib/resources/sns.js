var AWSResource = require('../awsresource')
    , types = require('../types');

var SubscriptionType = types.object('sns-subscription', {
    Endpoint: types.string, // required
    Protocol: types.string, // required
});

var Topic = AWSResource.define('AWS::SNS::Topic', {
    DisplayName: { type: types.string },
    TopicName: { type: types.string },
    Subscription: { type: types.array },
});

var TopicPolicy = AWSResource.define('AWS::SNS::TopicPolicy', {
    PolicyDocument: { type: types.jsonobject, required: true },
    Queues: { type: types.array, required: true },
});

module.exports = {
    Topic: Topic,
    TopicPolicy: TopicPolicy,
};
