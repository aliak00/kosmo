var AWSResource = require('../aws-resource')
    , types = require('../types');

var Cluster = AWSResource.define('AWS::ECS::Cluster', {});

var EnvironmentType = types.object('Environment', {
    Name: { type: types.string, required: true },
    Value: { type: types.string, required: true },
});

var MountPointType = types.object('MountPoint', {
    ContainerPath: { type: types.string, required: true },
    SourceVolume: { type: types.string, required: true },
    ReadOnly: { type: types.boolean },
});

var PortMappingType = types.object('PortMapping', {
    ContainerPort: { type: types.number, required: true },
    HostPort: { type: types.number },
});

var VolumeFromType = types.object('VolumeFrom', {
    SourceContainer: { type: types.string, required: true },
    ReadOnly: { type: types.boolean },
});

var ContainerDefinitonType = types.object('ContainerDefiniton', {
    Command: { type: types.array(types.string) },
    Cpu: { type: types.number },
    EntryPoint: { type: types.array(types.string) },
    Environment: { type: types.array(EnvironmentType) },
    Essential: { type: types.boolean },
    Image: { type: types.string, required: true },
    Links: { type: types.array(types.string) },
    Memory: { type: types.number, required: true },
    MountPoints: { type: types.array(MountPointType) },
    Name: { type: types.string, required: true },
    PortMappings: { type: types.array(PortMappingType) },
    VolumesFrom: { type: types.array(VolumeFromType) },
});

var HostType = types.object('Host', {
    SourcePath: { type: types.string },
});

var VolumeType = types.object('Volume', {
    Name: { type: types.string, required: true },
    Host: { type: HostType },
});

var TaskDefinition = AWSResource.define('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: { type: types.array(ContainerDefinitonType), required: true },
    Volumes: { type: types.array(VolumeType), required: true },
});

var Service = AWSResource.define('AWS::ECS::Service', {
    Cluster: { type: types.string, required: true },
    DesiredCount: { type: types.number, required: true },
    LoadBalancers: { type: types.array },
    Role: { type: types.string, required: 'conditional' },
    TaskDefinition: { type: types.string, required: true },
});

module.exports = {
    Cluster: Cluster,
    TaskDefinition: TaskDefinition,
    Service: Service,
};
