var AWSResource = require('../aws-resource')
    , types = require('../types');

var NumberOfNodesValidator = function(self) {
    if (self.properties.ClusterType === 'single-node') {
        return 'NumberOfNodes must be unset if NodeType is single-node';
    }
};

var Cluster = AWSResource.define('AWS::Redshift::Cluster', {
    AllowVersionUpgrade : { type: types.boolean },
    AutomatedSnapshotRetentionPeriod : { type: types.number },
    AvailabilityZone : { type: types.string },
    ClusterParameterGroupName : { type: types.string },
    ClusterSecurityGroups : { type: types.array },
    ClusterSubnetGroupName : { type: types.string },
    ClusterType : { type: types.enum('single-node', 'multi-node'), required: true },
    ClusterVersion : { type: types.string },
    DBName : { type: types.string, required: true },
    ElasticIp : { type: types.string },
    Encrypted : { type: types.boolean },
    HsmClientCertificateIdentifier : { type: types.string },
    HsmConfigurationIdentifier : { type: types.string },
    MasterUsername : { type: types.string, required: true },
    MasterUserPassword : { type: types.string, required: true },
    NodeType : { type: types.string, required: true },
    NumberOfNodes : { type: types.number, required: 'conditional', validators: [NumberOfNodesValidator] },
    OwnerAccount : { type: types.string },
    Port : { type: types.number },
    PreferredMaintenanceWindow : { type: types.string },
    PubliclyAccessible : { type: types.boolean },
    SnapshotClusterIdentifier : { type: types.string, required: 'conditional' },
    SnapshotIdentifier : { type: types.string, required: 'conditional' },
    VpcSecurityGroupIds : { type: types.array },
});

var ClusterParameterGroup = AWSResource.define('AWS::Redshift::ClusterParameterGroup', {
    Description : { type: types.string, required: true },
    ParameterGroupFamily : { type: types.string, required: true },
    Parameters : { type: types.string },
});

var ClusterSecurityGroup = AWSResource.define('AWS::Redshift::ClusterSecurityGroup', {
    Description : { type: types.string, required: true },
});

var ClusterSecurityGroupIngress = AWSResource.define('AWS::Redshift::ClusterSecurityGroupIngress', {
    ClusterSecurityGroupName : { type: types.string, required: true },
    CIDRIP : { type: types.string },
    EC2SecurityGroupName : { type: types.string },
    EC2SecurityGroupOwnerId : { type: types.string, required: 'conditional' },
});

var ClusterSubnetGroup = AWSResource.define('AWS::Redshift::ClusterSubnetGroup', {
    Description : { type: types.string, required: true },
    SubnetIds : { type: types.array, required: true },
});

module.exports = {
    Cluster: Cluster,
    ClusterParameterGroup: ClusterParameterGroup,
    ClusterSecurityGroup: ClusterSecurityGroup,
    ClusterSecurityGroupIngress: ClusterSecurityGroupIngress,
    ClusterSubnetGroup: ClusterSubnetGroup,
};
