var AWSResource = require('../awsresource')
    , types = require('../types');

var SubscriptionType = types.object('sns-subscription', { // eslint-disable-line no-unused-vars
    Endpoint: types.string, // required
    Protocol: types.enum('http', 'https', 'email', 'email-json', 'sms', 'sqs', 'application', 'lambda'), // required
});

var Topic = AWSResource.define('AWS::SNS::Topic', {
    DisplayName: { type: types.string },
    TopicName: { type: types.string },
    Subscription: { type: types.array }, // array of SubscriptionType
});

var TopicPolicy = AWSResource.define('AWS::SNS::TopicPolicy', {
    PolicyDocument: { type: types.jsonobject, required: true },
    Topics: { type: types.array, required: true },
});

module.exports = {
    Topic: Topic,
    TopicPolicy: TopicPolicy,
};
