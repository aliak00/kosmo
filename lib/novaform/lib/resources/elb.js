var AWSResource = require('../aws-resource')
    , types = require('../types');

var AccessLoggingPolicy = types.object('elb-access-logging-policy', {
    EmitInterval: { type: types.number },
    Enabled: { type: types.boolean, required: true },
    S3BucketName: { type: types.string, required: true },
    S3BucketPrefix: { type: types.string },
});

var AppCookieStickinessPolicy = types.object('elb-app-cookies-stickiness-policy', {
    CookieName: { type: types.string, required: true },
    PolicyName: { type: types.string, required: true },
});

var ConnectionDrainingPolicy = types.object('elb-connection-draining-policy', {
    Enabled: { type: types.boolean, required: true },
    Timeout: { type: types.number },
});

var ConnectionSettings = types.object('elb-connection-settings', {
    IdleTimeout: { type: types.number, required: true },
});

var HealthCheckType = types.object('elb-healthcheck-type', {
    HealthyThreshold: { type: types.number, required: true },
    Interval: { type: types.number, required: true },
    Target: { type: types.string, required: true },
    Timeout: { type: types.number, required: true },
    UnhealthyThreshold: { type: types.number, required: true },
});

var LBCookieStickinessPolicy = types.object('elb-lb-cookie-stickiness-policy', {
    CookieExpirationPeriod: { type: types.string },
    PolicyName: { type: types.string, required: true },
});

var PolicyAttributeType = types.object('elb-policy-attribute', {
    Name: { type: types.string, required: true },
    Value: { type: types.string, required: true },
});

var Policy = types.object('elb-policy', {
    Attributes: { type: types.array(PolicyAttributeType) },
    InstancePorts: { type: types.array(types.string) },
    LoadBalancerPorts: { type: types.array(types.string) },
    PolicyName: { type: types.string, required: true },
    PolicyType: { type: types.string, required: true },
});

var ListenerPropertyType = types.object('elb-listener-property-type', {
    InstancePort: { type: types.number, required: true },
    InstanceProtocol: { type: types.string },
    LoadBalancerPort: { type: types.number, required: true },
    PolicyNames: { type: types.array(types.string) },
    Protocol: { type: types.string, required: true },
    SSLCertificateId: { type: types.string },
});

var LoadBalancer = AWSResource.define('AWS::ElasticLoadBalancing::LoadBalancer', {
    AccessLoggingPolicy: { type: AccessLoggingPolicy },
    AppCookieStickinessPolicy: { type: types.array(AppCookieStickinessPolicy) },
    AvailabilityZones: { type: types.array(types.strings) },
    ConnectionDrainingPolicy: { type: ConnectionDrainingPolicy },
    ConnectionSettings: { type: ConnectionSettings },
    CrossZone: { type: types.boolean },
    HealthCheck: { type: HealthCheckType },
    Instances: { type: types.array(types.string) },
    LBCookieStickinessPolicy: { type: LBCookieStickinessPolicy },
    LoadBalancerName: { type: types.string },
    Listeners: { type: types.array(ListenerPropertyType), required: true },
    Policies: { type: types.array(Policy) },
    Scheme: { type: types.enum('internal', 'internet-facing' )},
    SecurityGroups: { type: types.array(types.string) },
    Subnets: { type: types.array(types.string) },
    Tags: { type: types.tags },
});

module.exports = {
    LoadBalancer: LoadBalancer,
};
