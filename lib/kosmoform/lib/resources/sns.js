var AWSResource = require('../aws-resource')
    , types = require('../types');

var SubscriptionType = types.object('Subscription', {
    Endpoint: { type: types.string, required: true },
    Protocol: { type: types.enum(
        'http', 'https', 'email', 'email-json',
        'sms', 'sqs', 'application', 'lambda'), required: true },
});

var Topic = AWSResource.define('AWS::SNS::Topic', {
    DisplayName: { type: types.string },
    TopicName: { type: types.string },
    Subscription: { type: types.array(SubscriptionType) },
});

var TopicPolicy = AWSResource.define('AWS::SNS::TopicPolicy', {
    PolicyDocument: { type: types.jsonobject, required: true },
    Topics: { type: types.array(types.string), required: true },
});

module.exports = {
    Topic: Topic,
    TopicPolicy: TopicPolicy,
};
