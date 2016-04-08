var AWSResource = require('../aws-resource')
    , types = require('../types');

var DBSubnetGroup = AWSResource.define('AWS::RDS::DBSubnetGroup', {
    DBSubnetGroupDescription : { type: types.string, required: true },
    SubnetIds : { type: types.array(types.string), required: true },
    Tags : { type: types.tags },
});

function DBSnapshotIdentifierValidator(self) {
    if (self.properties.DBName) {
        return 'DBName must be null if DBSnapshotIdentifier is specified';
    }
}

var DBInstance = AWSResource.define('AWS::RDS::DBInstance', {
    AllocatedStorage : { type: types.number, required: true },
    AllowMajorVersionUpgrade : { type: types.boolean },
    AutoMinorVersionUpgrade : { type: types.boolean },
    AvailabilityZone : { type: types.string },
    BackupRetentionPeriod : { type: types.number },
    CharacterSetName : { type: types.string },
    DBInstanceClass : { type: types.string, required: true },
    DBInstanceIdentifier : { type: types.string },
    DBName : { type: types.string },
    DBParameterGroupName : { type: types.string },
    DBSecurityGroups : { type: types.array(types.string) },
    DBSnapshotIdentifier : { type: types.string, validators: [DBSnapshotIdentifierValidator] },
    DBSubnetGroupName : { type: types.string },
    Engine : { type: types.string, required: 'conditional' },
    EngineVersion : { type: types.string },
    Iops : { type: types.number, required: 'conditional' },
    KmsKeyId : { type: types.string },
    LicenseModel : { type: types.string },
    MasterUsername : { type: types.string, required: 'conditional' },
    MasterUserPassword : { type: types.string, required: 'conditional' },
    MultiAZ : { type: types.boolean },
    OptionGroupName : { type: types.string },
    Port : { type: types.string },
    PreferredBackupWindow : { type: types.string },
    PreferredMaintenanceWindow : { type: types.string },
    PubliclyAccessible : { type: types.boolean },
    SourceDBInstanceIdentifier : { type: types.string },
    StorageEncrypted : { type: types.boolean, required: 'conditional' },
    StorageType : { type: types.enum('standard', 'gp2', 'io1') },
    Tags : { type: types.tags },
    VPCSecurityGroups : { type: types.array(types.string) },
});

var DBParameterGroup = AWSResource.define('AWS::RDS::DBParameterGroup', {
    Description : { type: types.string, required: true },
    Family : { type: types.string, required: true },
    Parameters : { type: types.object },
    Tags : { type: types.tags },
});

var RDSSecurityGroupRuleType = types.object('RDSSecurityGroupRule', {
    CIDRIP: { type: types.string },
    EC2SecurityGroupId: { type: types.string },
    EC2SecurityGroupName: { type: types.string },
    EC2SecurityGroupOwnerId: { type: types.string },
});

var DBSecurityGroup = AWSResource.define('AWS::RDS::DBSecurityGroup', {
    EC2VpcId : { type: types.string, required: 'conditional' },
    DBSecurityGroupIngress : { type: types.array(RDSSecurityGroupRuleType), required: true },
    GroupDescription : { type: types.string, required: true },
    Tags : { type: types.tags },
});

var DBSecurityGroupIngress = AWSResource.define('AWS::RDS::DBSecurityGroupIngress', {
    CIDRIP : { type: types.string },
    DBSecurityGroupName : { type: types.string, required: true },
    EC2SecurityGroupId : { type: types.string },
    EC2SecurityGroupName : { type: types.string },
    EC2SecurityGroupOwnerId : { type: types.string },
});

var EventSubscription = AWSResource.define('AWS::RDS::EventSubscription', {
    Enabled : { type: types.boolean },
    EventCategories : { type: types.array(types.string) },
    SnsTopicArn : { type: types.string, required: true },
    SourceIds : { type: types.array(types.string) },
    SourceType : { type: types.string, required: 'conditional' },
});

module.exports = {
    DBSubnetGroup: DBSubnetGroup,
    DBInstance: DBInstance,
    DBParameterGroup: DBParameterGroup,
    DBSecurityGroup: DBSecurityGroup,
    DBSecurityGroupIngress: DBSecurityGroupIngress,
    EventSubscription: EventSubscription,
};
