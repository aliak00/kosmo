var AWSResource = require('../awsresource')
    , types = require('../types');

var EbsBlockDeviceType = types.object('asg-ebs-block-device', {
    DeleteOnTermination: types.boolean,
    Iops: types.number,
    SnapshotId: types.string,
    VolumeSize: types.number,
    VolumeType: types.string,
});

var BlockDeviceMappingsType = types.object('asg-block-device-mappings', {
    DeviceName: types.string,
    Ebs: EbsBlockDeviceType,
    NoDevice: types.boolean,
    VirtualName: types.string,
});

var LaunchConfiguration = AWSResource.define('AWS::AutoScaling::LaunchConfiguration', {
    AssociatePublicIpAddress : { type: types.boolean },
    BlockDeviceMappings : { type: BlockDeviceMappingsType },
    EbsOptimized : { type: types.boolean },
    IamInstanceProfile : { type: types.string },
    ImageId : { type: types.string, required: true },
    InstanceId : { type: types.string },
    InstanceMonitoring : { type: types.boolean },
    InstanceType : { type: types.string, required: true },
    KernelId : { type: types.string },
    KeyName : { type: types.string },
    RamDiskId : { type: types.string },
    SecurityGroups : { type: types.array },
    SpotPrice : { type: types.string },
    UserData : { type: types.string },
});

var AutoScalingGroupNotificationConfigurationType = types.object('asg-notification-configuration', {
    NotificationTypes: types.array,
    TopicARN: types.string,
});

var AutoScalingGroup = AWSResource.define('AWS::AutoScaling::AutoScalingGroup', {
    AvailabilityZones : { type: types.array, required: true },
    Cooldown : { type: types.string },
    DesiredCapacity : { type: types.number },
    HealthCheckGracePeriod : { type: types.number },
    HealthCheckType : { type: types.enum('EC2', 'ELB') },
    InstanceId : { type: types.string, required: 'conditional' },
    LaunchConfigurationName : { type: types.string, required: 'conditional' },
    LoadBalancerNames : { type: types.array },
    MaxSize : { type: types.number, required: true },
    MetricsCollection : { type: types.array },
    MinSize : { type: types.number, required: true },
    NotificationConfiguration : { type: AutoScalingGroupNotificationConfigurationType },
    PlacementGroup : { type: types.string },
    Tags : { type: types.tags },
    TerminationPolicies : { type: types.array },
    VPCZoneIdentifier : { type: types.array },
});

module.exports = {
    LaunchConfiguration: LaunchConfiguration,
    AutoScalingGroup: AutoScalingGroup
};
