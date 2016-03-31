var AWSResource = require('../aws-resource')
    , types = require('../types');

var AccessLoggingPolicy = types.object('elb-access-logging-policy', {
    EmitInterval: types.number,
    Enabled: types.boolean, // required
    S3BucketName: types.string, // required
    S3BucketPrefix: types.string,
});

var AppCookieStickinessPolicy = types.object('elb-app-cookies-stickiness-policy', {  // eslint-disable-line no-unused-vars
    CookieName: types.string, // required
    PolicyName: types.string, // required
});

var ConnectionDrainingPolicy = types.object('elb-connection-draining-policy', {
    Enabled: types.boolean, // required
    Timeout: types.number,
});

var ConnectionSettings = types.object('elb-connection-settings', {
    IdleTimeout: types.number, // required
});

var HealthCheckType = types.object('elb-healthcheck-type', {
    HealthyThreshold: types.number, // required
    Interval: types.number, // required
    Target: types.string, // required
    Timeout: types.number, // required
    UnhealthyThreshold: types.number, // required
});

var LBCookieStickinessPolicy = types.object('elb-lb-cookie-stickiness-policy', {
    CookieExpirationPeriod: types.string,
    PolicyName: types.string, // required
});

var Policy = types.object('elb-policy', { // eslint-disable-line no-unused-vars
    Attributes: types.array,
    InstancePorts: types.array,
    LoadBalancerPorts: types.array,
    PolicyName: types.string, // required
    PolicyType: types.string, // required
});

var ListenerPropertyType = types.object('elb-listener-property-type', { // eslint-disable-line no-unused-vars
    InstancePort: types.number, // required
    InstanceProtocol: types.string,
    LoadBalancerPort: types.number, // required
    PolicyNames: types.array,
    Protocol: types.string, // required
    SSLCertificateId: types.string,
});

var LoadBalancer = AWSResource.define('AWS::ElasticLoadBalancing::LoadBalancer', {
    AccessLoggingPolicy: { type: AccessLoggingPolicy },
    AppCookieStickinessPolicy: { type: types.array }, // array of AppCookieStickinessPolicy
    AvailabilityZones: { type: types.array },
    ConnectionDrainingPolicy: { type: ConnectionDrainingPolicy },
    ConnectionSettings: { type: ConnectionSettings },
    CrossZone: { type: types.boolean },
    HealthCheck: { type: HealthCheckType },
    Instances: { type: types.array },
    LBCookieStickinessPolicy: { type: LBCookieStickinessPolicy },
    LoadBalancerName: { type: types.string },
    Listeners: { type: types.array, required: true }, // array of ListenerPropertyType
    Policies: { type: types.array }, // array of Policy
    Scheme: { type: types.enum('internal', 'internet-facing' )},
    SecurityGroups: { type: types.array },
    Subnets: { type: types.array },
    Tags: { type: types.tags },
});

module.exports = {
    LoadBalancer: LoadBalancer,
};
