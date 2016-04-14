var AWSResource = require('../aws-resource')
    , types = require('../types');

var EbsBlockDeviceType = types.object('EbsBlockDevice', {
    DeleteOnTermination: { type: types.boolean },
    Iops: { type: types.number },
    SnapshotId: { type: types.string },
    VolumeSize: { type: types.number },
    VolumeType: { type: types.string },
});

var BlockDeviceMappingsType = types.object('BlockDeviceMappings', {
    DeviceName: { type: types.string },
    Ebs: { type: EbsBlockDeviceType },
    NoDevice: { type: types.boolean },
    VirtualName: { type: types.string },
});

var LaunchConfiguration = AWSResource.define('AWS::AutoScaling::LaunchConfiguration', {
    AssociatePublicIpAddress : { type: types.boolean },
    BlockDeviceMappings : { type: types.array(BlockDeviceMappingsType) },
    EbsOptimized : { type: types.boolean },
    IamInstanceProfile : { type: types.string },
    ImageId : { type: types.string, required: true },
    InstanceId : { type: types.string },
    InstanceMonitoring : { type: types.boolean },
    InstanceType : { type: types.string, required: true },
    KernelId : { type: types.string },
    KeyName : { type: types.string },
    RamDiskId : { type: types.string },
    SecurityGroups : { type: types.array(types.string) },
    SpotPrice : { type: types.string },
    UserData : { type: types.string },
});

var MetricsCollectionType = types.object('MetricsCollection', {
    Granularity: { type: types.string, required: true },
    Metrics: { type: types.array(types.string), required: 'conditional' },
});

var NotificationConfigurationType = types.object('NotificationConfiguration', {
    NotificationTypes: { type: types.array(types.string) },
    TopicARN: { type: types.string },
});

var AutoScalingGroup = AWSResource.define('AWS::AutoScaling::AutoScalingGroup', {
    AvailabilityZones : { type: types.array(types.string), required: 'conditional' },
    Cooldown : { type: types.string },
    DesiredCapacity : { type: types.number },
    HealthCheckGracePeriod : { type: types.number },
    HealthCheckType : { type: types.enum('EC2', 'ELB') },
    InstanceId : { type: types.string, required: 'conditional' },
    LaunchConfigurationName : { type: types.string, required: 'conditional' },
    LoadBalancerNames : { type: types.array(types.string) },
    MaxSize : { type: types.number, required: true },
    MetricsCollection : { type: types.array(MetricsCollectionType) },
    MinSize : { type: types.number, required: true },
    NotificationConfiguration : { type: NotificationConfigurationType },
    PlacementGroup : { type: types.string },
    Tags : { type: types.tags },
    TerminationPolicies : { type: types.array(types.string) },
    VPCZoneIdentifier : { type: types.array(types.string) },
});

var ScheduledAction = AWSResource.define('AWS::AutoScaling::ScheduledAction', {
    AutoScalingGroupName : { type: types.string, required: true },
    DesiredCapacity : { type: types.number },
    EndTime : { type: types.string },
    MaxSize : { type: types.number },
    MinSize : { type: types.number },
    Recurrence : { type: types.string },
    StartTime : { type: types.string },
});

module.exports = {
    LaunchConfiguration: LaunchConfiguration,
    AutoScalingGroup: AutoScalingGroup,
    ScheduledAction: ScheduledAction,
};
