var AWSResource = require('../awsresource')
    , types = require('../types');

var HealthCheckConfigType = types.object('route53-healthcheck-config', {
    FailureThreshold: types.number,
    FullyQualifiedDomainName: types.string, // conditional
    IPAddress: types.string,
    Port: types.number, // conditional
    RequestInterval: types.number,
    ResourcePath: types.string,
    SearchString: types.string,
    Type: types.string, // required => HTTP, HTTPS, HTTP_STR_MATCH, HTTPS_STR_MATCH, or TCP
});

var HealthCheckTagsType = types.object('route53-healthcheck-tags', {
    Key: types.string, // required
    Value: types.string, // required
});

var HealthCheck = AWSResource.define('AWS::Route53::HealthCheck', {
    HealthCheckConfig: { type: HealthCheckConfigType, required: true },
    HealthCheckTags: { type: types.array },
});

var HostedZoneConfigType = types.object('route53-hostedzone-config', {
    Comment: types.string,
});

var HostedZoneTagsType = types.object('route53-hostedzone-tags', {
    Key: types.string, // required
    Value: types.string, // required
});

var HostedZoneVPCsType = types.object('route53-hostezone-vpcs', {
    VPCId: types.string, // required
    VPCRegion: types.string, // required
});

var HostedZone = AWSResource.define('AWS::Route53::HostedZone', {
    HostedZoneConfig: { type: HostedZoneConfigType, required: true },
    HostedZoneTags: { type: types.array },
    Name: { type: types.string, required: true },
    VPCs: { type: types.array },
});

var RecordSetAliasTargetType = types.object('route53-recordset-aliastarget', {
    DNSName: types.string, // required
    EvaluateTargetHealth: types.boolean,
    HostedZoneId: types.string, // required
});

var RecordSetGeoLocationType = types.object('route53-recordset-geolocation', {
    ContinentCode: types.string, // conditional
    CountryCode: types.string, // conditional
    SubdivisionCode: types.string,
});

function AliasTargetValidator(self) {
    if (self.TTL) {
        return 'Cannot specify TTL. The alias uses a TTL value from the alias target record.';
    }
}

function ResourceRecordsValidator(self) {
    if ((self.TTL || self.SetIdentifier) && !(self.ResourceRecords && self.ResourceRecords.length)) {
        return 'ResourceRecords must be set if either TTL or SetIdentifier is set';
    }
}

var RecordSet = AWSResource.define('AWS::Route53::RecordSet', {
    AliasTarget: { type: types.string, required: 'conditional', validators: [AliasTargetValidator] },
    Comment: { type: types.string },
    Failover: { type: types.enum('PRIMARY', 'SECONDARY') },
    GeoLocation: { type: RecordSetGeoLocationType },
    HealthCheckId: { type: types.string },
    HostedZoneId: { type: types.string, required: 'conditional' },
    HostedZoneName: { type: types.string, required: 'conditional' },
    Name: { type: types.string, required: true },
    Region: { type: types.string },
    ResourceRecords: { type: types.array, validators: [ResourceRecordsValidator] },
    SetIdentifier: { type: types.string, required: 'conditional' },
    TTL: { type: types.string },
    Type: { type: types.enum('A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SPF', 'SRV', 'TXT'), required: true },
    Weight: { type: types.number, required: 'conditional' },
});
RecordSet.prototype.validate = function() {
    var props = this.properties;
    if (!props.HostedZoneId && !props.HostedZoneName) {
        return 'either HostedZoneName or HostedZoneId must be specified';
    }
};

var RecordSetGroup = AWSResource.define('AWS::Route53::RecordSetGroup', {
    HostedZoneId: { type: types.string, required: 'conditional' },
    HostedZoneName: { type: types.string, required: 'conditional' },
    RecordSets: { type: types.array, required: true },
    Comment: { type: types.string, required: 'conditional' },
});

module.exports = {
    HealthCheck: HealthCheck,
    HostedZone: HostedZone,
    RecordSet: RecordSet,
    RecordSetGroup: RecordSetGroup,
};
