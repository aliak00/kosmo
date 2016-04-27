var AWSResource = require('../aws-resource')
    , types = require('../types');

var CacheCluster = AWSResource.define('AWS::ElastiCache::CacheCluster', {
    AutoMinorVersionUpgrade : { type: types.boolean },
    AZMode : { type: types.enum('single-az', 'cross-az'), required: 'conditional' },
    CacheNodeType : { type: types.string, required: true },
    CacheParameterGroupName : { type: types.string },
    CacheSecurityGroupNames : { type: types.array(types.string), required: 'conditional' },
    CacheSubnetGroupName : { type: types.string },
    ClusterName : { type: types.string },
    Engine : { type: types.enum('memcached', 'redis'), required: true },
    EngineVersion : { type: types.string },
    NotificationTopicArn : { type: types.string },
    NumCacheNodes : { type: types.number, required: true },
    Port : { type: types.number },
    PreferredAvailabilityZone : { type: types.string },
    PreferredAvailabilityZones : { type: types.array(types.string) },
    PreferredMaintenanceWindow : { type: types.string },
    SnapshotArns : { type: types.array(types.string) },
    SnapshotRetentionLimit : { type: types.number },
    SnapshotWindow : { type: types.string },
    VpcSecurityGroupIds : { type: types.array(types.string), required: 'conditional' },
}, {
    validator: function(context) {
        if (context.properties.Engine === 'redis') {
            if (context.properties.PreferredAvailabilityZones) {
                context.addError('PreferredAvailabilityZones only supported for memcached');
            }
            if (context.properties.AZMode) {
                context.addError('AZMode only supported for memcached');
            }
        } else {
            if (context.properties.PreferredAvailabilityZones
                && !(context.properties.AZMode && context.properties.AZMode === 'cross-az')) {
                context.addError('AZMode must be cross-az if PreferredAvailabilityZones is set (notice the \'s\' at the end');
            }
        }
    },
});

var ParameterGroup = AWSResource.define('AWS::ElastiCache::ParameterGroup', {
    CacheParameterGroupFamily : { type: types.string, required: true },
    Description : { type: types.string, required: true },
    Properties : { type: types.object('ec-parameter-group') },
});

var SecurityGroup = AWSResource.define('AWS::ElastiCache::SecurityGroup', {
    Description : { type: types.string },
});

var SecurityGroupIngress = AWSResource.define('AWS::ElastiCache::SecurityGroupIngress', {
    CacheSecurityGroupName : { type: types.string, required: true },
    EC2SecurityGroupName : { type: types.string, required: true },
    EC2SecurityGroupOwnerId : { type: types.string },
});

var SubnetGroup = AWSResource.define('AWS::ElastiCache::SubnetGroup', {
    Description : { type: types.string, required: true },
    SubnetIds : { type: types.array(types.string), required: true },
});

module.exports = {
    CacheCluster: CacheCluster,
    ParameterGroup: ParameterGroup,
    SecurityGroup: SecurityGroup,
    SecurityGroupIngress: SecurityGroupIngress,
    SubnetGroup: SubnetGroup,
};
