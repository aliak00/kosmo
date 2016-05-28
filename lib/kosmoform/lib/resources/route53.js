var AWSResource = require('../aws-resource')
    , commonObjects = require('../common-objects')
    , types = require('../types');

var HealthCheckConfigType = types.object('HealthCheckConfig', {
    FailureThreshold: { type: types.number },
    FullyQualifiedDomainName: { type: types.string, required: 'conditional' },
    IPAddress: { type: types.string },
    Port: { type: types.number, required: 'conditional' },
    RequestInterval: { type: types.number },
    ResourcePath: { type: types.string },
    SearchString: { type: types.string },
    Type: { type: types.enum('HTTP', 'HTTPS', 'HTTP_STR_MATCH', 'HTTPS_STR_MATCH', 'TCP'), required: true },
});

var HealthCheckTagType = commonObjects.KeyValuePair('HealthCheckTag', types.string, types.string);

var HealthCheck = AWSResource.define('AWS::Route53::HealthCheck', {
    HealthCheckConfig: { type: HealthCheckConfigType, required: true },
    HealthCheckTags: { type: types.array(HealthCheckTagType) },
});

var HostedZoneConfigType = types.object('HostedZoneConfig', {
    Comment: { type: types.string },
});

var HostedZoneTagType = commonObjects.KeyValuePair('HostedZoneTag', types.string, types.string);

var VPCType = types.object('VPC', {
    VPCId: { type: types.string, required: true },
    VPCRegion: { type: types.string, required: true },
});

var HostedZone = AWSResource.define('AWS::Route53::HostedZone', {
    HostedZoneConfig: { type: HostedZoneConfigType },
    HostedZoneTags: { type: types.array(HostedZoneTagType) },
    Name: { type: types.string, required: true },
    VPCs: { type: types.array(VPCType) },
});

var AliasTargetType = types.object('AliasTarget', {
    DNSName: { type: types.string, required: true },
    EvaluateTargetHealth: { type: types.boolean },
    HostedZoneId: { type: types.string, required: true },
});

var GeoLocationType = types.object('GeoLocation', {
    ContinentCode: { type: types.string, required: 'conditional' },
    CountryCode: { type: types.string, required: 'conditional' },
    SubdivisionCode: { type: types.string },
});

const RecordSetTypeEnum = types.enum('A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SPF', 'SRV', 'TXT');

var RecordSet = AWSResource.define('AWS::Route53::RecordSet', {
    AliasTarget: { type: AliasTargetType, required: 'conditional' },
    Comment: { type: types.string },
    Failover: { type: types.enum('PRIMARY', 'SECONDARY') },
    GeoLocation: { type: GeoLocationType },
    HealthCheckId: { type: types.string },
    HostedZoneId: { type: types.string, required: 'conditional' },
    HostedZoneName: { type: types.string, required: 'conditional' },
    Name: { type: types.string, required: true },
    Region: { type: types.string },
    ResourceRecords: { type: types.array(types.string) },
    SetIdentifier: { type: types.string, required: 'conditional' },
    TTL: { type: types.string },
    Type: { type: RecordSetTypeEnum, required: true },
    Weight: { type: types.number, required: 'conditional' },
}, {
    validator: function(context) {
        if (context.properties.AliasTarget && context.properties.TTL) {
            context.addError('Cannot specify TTL. The alias uses a TTL value from the alias target record.');
        }
        if ((context.properties.TTL || context.properties.SetIdentifier) && !(context.properties.ResourceRecords && context.properties.ResourceRecords.length)) {
            context.addError('ResourceRecords must be set if either TTL or SetIdentifier is set');
        }
        if (!context.properties.HostedZoneId && !context.properties.HostedZoneName) {
            context.addError('either HostedZoneName or HostedZoneId must be specified');
        }
    },
});

var RecordSetType = types.object('RecordSet', {
    Name: { type: types.string, required: true },
    Type: { type: RecordSetTypeEnum, required: true },
    TTL: { type: types.string },
    SetIdentifier: { type: types.string, required: 'conditional' },
    ResourceRecords: { type: types.array(types.string), required: true }, // (because there's no AliasTarget here)
});

var RecordSetGroup = AWSResource.define('AWS::Route53::RecordSetGroup', {
    HostedZoneId: { type: types.string, required: 'conditional' },
    HostedZoneName: { type: types.string, required: 'conditional' },
    RecordSets: { type: types.array(RecordSetType), required: true },
    Comment: { type: types.string, required: 'conditional' },
});

module.exports = {
    HealthCheck: HealthCheck,
    HostedZone: HostedZone,
    RecordSet: RecordSet,
    RecordSetGroup: RecordSetGroup,
};
