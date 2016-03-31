var AWSResource = require('../aws-resource')
    , types = require('../types');

var Cluster = AWSResource.define('AWS::ECS::Cluster', {});

var TaskDefintionContainerDefinitonEnvironment = types.object('ecs-taskdefinition-containerdefinition-environment', { // eslint-disable-line no-unused-vars
    Name: types.string, // required
    Value: types.string, // required
});

var TaskDefintionContainerDefinitonMountPoints = types.object('ecs-taskdefinition-containerdefinition-mountpoints', { // eslint-disable-line no-unused-vars
    ContainerPath: types.string, // required
    SourceVolume: types.string, // required
    ReadOnly: types.boolean,
});

var TaskDefintionContainerDefinitonPortMappings = types.object('ecs-taskdefinition-containerdefinition-portmappings', { // eslint-disable-line no-unused-vars
    ContainerPort: types.number, // required
    HostPort: types.number,
});

var TaskDefintionContainerDefinitonVolumesFrom = types.object('ecs-taskdefinition-containerdefinition-volumesfrom', { // eslint-disable-line no-unused-vars
    SourceContainer: types.string, // required
    ReadOnly: types.boolean,
});

var TaskDefintionContainerDefiniton = types.object('ecs-taskdefinition-containerdefinition', { // eslint-disable-line no-unused-vars
    Command: types.array,
    Cpu: types.number,
    EntryPoint: types.array,
    Environment: types.array, // array of TaskDefintionContainerDefinitonEnvironment
    Essential: types.boolean,
    Image: types.string, // required
    Links: types.array,
    Memory: types.number, // required
    MountPoints: types.array, // array of TaskDefintionContainerDefinitonMountPoints
    Name: types.string, // required
    PortMappings: types.array, // array of TaskDefintionContainerDefinitonPortMappings
    VolumesFrom: types.array, // array of TaskDefintionContainerDefinitonVolumesFrom
});

var TaskDefintionVolumesHost = types.object('ecs-taskdefinition-volumes-host', {
    SourcePath: types.string,
});

var TaskDefintionVolumes = types.object('ecs-taskdefinition-volumes', { // eslint-disable-line no-unused-vars
    Name: types.string, // required
    Host: TaskDefintionVolumesHost,
});

var TaskDefinition = AWSResource.define('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: { type: types.array, required: true }, // array of TaskDefintionContainerDefiniton
    Volumes: { type: types.array, required: true }, // array of TaskDefintionVolumes
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
