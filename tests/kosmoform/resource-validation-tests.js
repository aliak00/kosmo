var _ = require('lodash')
    , kosmoform = require('../../lib/kosmoform/');

describe('kosmoform.resources', function() {

    describe('cloudwatch', function() {

        describe('Alarm', function() {
            it('should produce warning if AlarmName set', function() {
                var resource = kosmoform.cloudwatch.Alarm('Alarm', {
                    AlarmName: 'alarm-name',
                    ComparisonOperator: 'GreaterThanThreshold',
                    EvaluationPeriods: 1,
                    MetricName: 'metric',
                    Namespace: 'namespace',
                    Period: 1,
                    Statistic: 'Sum',
                    Threshold: 1,
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(1);
                expect(validationResults).to.have.property('errors').and.be.length(0);
                expect(validationResults).to.have.deep.property('warnings[0]').and.match(/validation warning/);
            });
            it('should not warning if AlarmName not set', function() {
                var resource = kosmoform.cloudwatch.Alarm('Alarm', {
                    ComparisonOperator: 'GreaterThanThreshold',
                    EvaluationPeriods: 1,
                    MetricName: 'metric',
                    Namespace: 'namespace',
                    Period: 1,
                    Statistic: 'Sum',
                    Threshold: 1,
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('ec', function() {

        describe('CacheCluster', function() {
            it('should account for AZMode if PreferredAvailabilityZones for memcached', function() {
                var resource = kosmoform.ec.CacheCluster('CacheCluster', {
                    CacheNodeType: 'node-type',
                    Engine: 'memcached',
                    NumCacheNodes: 1,
                    PreferredAvailabilityZones: ['preferred-availability-zone'],
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/AZMode must be cross-az/);
            });
            it('should not account for AZMode and PreferredAvailabilityZones for redis', function() {
                var resource = kosmoform.ec.CacheCluster('CacheCluster', {
                    CacheNodeType: 'node-type',
                    Engine: 'redis',
                    NumCacheNodes: 1,
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
            it('should allow AZMode and PreferredAvailabilityZones only for memcached', function() {
                var resource1 = kosmoform.ec.CacheCluster('CacheCluster', {
                    CacheNodeType: 'node-type',
                    Engine: 'redis',
                    NumCacheNodes: 1,
                    PreferredAvailabilityZones: ['preferred-availability-zone'],
                    AZMode: 'cross-az',
                });
                var validationResults1 = resource1.validate();
                expect(validationResults1).to.have.property('warnings').and.be.length(0);
                expect(validationResults1).to.have.property('errors').and.be.length(2);

                var resource2 = kosmoform.ec.CacheCluster('CacheCluster', {
                    CacheNodeType: 'node-type',
                    Engine: 'memcached',
                    NumCacheNodes: 1,
                    PreferredAvailabilityZones: ['preferred-availability-zone'],
                    AZMode: 'cross-az',
                });
                var validationResults2 = resource2.validate();
                expect(validationResults2).to.have.property('warnings').and.be.length(0);
                expect(validationResults2).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('ec2', function() {

        describe('Route', function() {
            it('should produce error if no id set', function() {
                var resource = kosmoform.ec2.Route('Route', {
                    DestinationCidrBlock: '0.0.0.0/0',
                    RouteTableId: 'route-table-id',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/should be set/);
            });
            it('should validate if an id is present', function() {
                var propertiesToCheck = [
                    'GatewayId',
                    'InstanceId',
                    'NetworkInterfaceId',
                    'VpcPeeringConnectionId',
                ];

                _.forEach(propertiesToCheck, prop => {
                    var properties = {
                        DestinationCidrBlock: '0.0.0.0/0',
                        RouteTableId: 'route-table-id',
                    };
                    properties[prop] = 'id';
                    var resource = kosmoform.ec2.Route('Route', properties);
                    var validationResults = resource.validate();
                    expect(validationResults).to.have.property('warnings').and.be.length(0);
                    expect(validationResults).to.have.property('errors').and.be.length(0);
                });
            });
        });

        describe('NetworkAclEntry', function() {
            it('should not validate if protocol is icmp and Icmp not set', function() {
                var resource = kosmoform.ec2.NetworkAclEntry('NetworkAclEntry', {
                    CidrBlock: '0.0.0.0/0',
                    Egress: true,
                    NetworkAclId: 'id',
                    Protocol: 'icmp',
                    RuleAction: 'allow',
                    RuleNumber: 1,
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/Icmp property is not set/);
            });
            it('should validate if protocol is icmp and Icmp set', function() {
                var resource = kosmoform.ec2.NetworkAclEntry('NetworkAclEntry', {
                    CidrBlock: '0.0.0.0/0',
                    Egress: true,
                    NetworkAclId: 'id',
                    Protocol: 'icmp',
                    RuleAction: 'allow',
                    RuleNumber: 1,
                    Icmp: {},
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('elastic-beanstalk', function() {

        describe('ConfigurationTemplate', function() {
            it('should not validate without EnvironmentId, SolutionStackName, or SourceConfiguration', function() {
                var resource = kosmoform.eb.ConfigurationTemplate('ConfigurationTemplate', {
                    ApplicationName: 'application-name',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/Must specify/);
            });
            it('should validate with either EnvironmentId, SolutionStackName, or SourceConfiguration', function() {
                var propertiesToCheck = {
                    EnvironmentId: 'str',
                    SolutionStackName: 'str',
                    SourceConfiguration: {
                        ApplicationName: 'application-name',
                        TemplateName: 'template-name',
                    },
                };

                _.forEach(propertiesToCheck, (propValue, propName) => {
                    var properties = {
                        ApplicationName: 'application-name',
                    };
                    properties[propName] = propValue;
                    var resource = kosmoform.eb.ConfigurationTemplate('ConfigurationTemplate', properties);
                    var validationResults = resource.validate();
                    expect(validationResults).to.have.property('warnings').and.be.length(0);
                    expect(validationResults).to.have.property('errors').and.be.length(0);
                });
            });
        });

        describe('Environment', function() {
            it('should produce warning if EnvironmentName set', function() {
                var resource = kosmoform.eb.Environment('Environment', {
                    ApplicationName: 'application-name',
                    EnvironmentName: 'environment-name',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(1);
                expect(validationResults).to.have.property('errors').and.be.length(0);
                expect(validationResults).to.have.deep.property('warnings[0]').and.match(/validation warning/);
            });
            it('should not warn if EnvironmentName not set', function() {
                var resource = kosmoform.eb.Environment('Environment', {
                    ApplicationName: 'application-name',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('iam', function() {

        describe('InstanceProfile', function() {
            it('should validate valid Path strings', function() {
                var validPathStrings = [
                    '/path/path/',
                    '/path/',
                    '/',
                ];
                _.forEach(validPathStrings, path => {
                    var validationResults = kosmoform.iam.InstanceProfile('InstanceProfile', {
                        Path: path,
                        Roles: [
                            kosmoform.fn.ref('role-1'),
                        ],
                    }).validate();

                    expect(validationResults).to.have.property('warnings').and.be.length(0);
                    expect(validationResults).to.have.property('errors').and.be.length(0);
                });
            });
            it('should nto validate invalid Path strings', function() {
                var validPathStrings = [
                    '/path/path',
                    '/path',
                    '',
                    'path',
                    'path/',
                ];
                _.forEach(validPathStrings, path => {
                    var validationResults = kosmoform.iam.InstanceProfile('InstanceProfile', {
                        Path: path,
                        Roles: [
                            kosmoform.fn.ref('role-1'),
                        ],
                    }).validate();

                    expect(validationResults).to.have.property('warnings').and.be.length(0);
                    expect(validationResults).to.have.property('errors').and.be.length(1);
                    expect(validationResults).to.have.deep.property('errors[0]').and.match(/Path can contain/);
                });
            });
        });

    });

    describe('rds', function() {

        describe('DBInstance', function() {
            it('should not validate if DBName and DBSnapshotIdentifier set', function() {
                var resource = kosmoform.rds.DBInstance('DBInstance', {
                    AllocatedStorage: 1,
                    DBInstanceClass: 'db-instance-class',
                    DBSnapshotIdentifier: 'db-snapshot-identifier',
                    DBName: 'db-name',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/DBName and DBSnapshotIdentifier/);
            });
            it('should validate if either DBName or DBSnapshotIdentifier set', function() {
                var resource1 = kosmoform.rds.DBInstance('DBInstance', {
                    AllocatedStorage: 1,
                    DBInstanceClass: 'db-instance-class',
                    DBName: 'db-name',
                });
                var validationResults1 = resource1.validate();
                expect(validationResults1).to.have.property('warnings').and.be.length(0);
                expect(validationResults1).to.have.property('errors').and.be.length(0);

                var resource2 = kosmoform.rds.DBInstance('DBInstance', {
                    AllocatedStorage: 1,
                    DBInstanceClass: 'db-instance-class',
                    DBSnapshotIdentifier: 'db-snapshot-identifier',
                });
                var validationResults2 = resource2.validate();
                expect(validationResults2).to.have.property('warnings').and.be.length(0);
                expect(validationResults2).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('redshift', function() {

        describe('Cluster', function() {
            it('should not validate single-node has NumberOfNodes set', function() {
                var resource = kosmoform.redshift.Cluster('Cluster', {
                    ClusterType: 'single-node',
                    NumberOfNodes: 1,
                    DBName: 'db-name',
                    MasterUsername: 'master-username',
                    MasterUserPassword: 'master-password',
                    NodeType: 'node-type',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/NumberOfNodes must be unset/);
            });
            it('should validate multi-node with NumberOfNodes set', function() {
                var resource = kosmoform.redshift.Cluster('Cluster', {
                    ClusterType: 'multi-node',
                    NumberOfNodes: 1,
                    DBName: 'db-name',
                    MasterUsername: 'master-username',
                    MasterUserPassword: 'master-password',
                    NodeType: 'node-type',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
        });

    });

    describe('r53', function() {

        describe('RecordSet', function() {
            it('should not validate AliasTarget and TTL', function() {
                var validationResults = kosmoform.r53.RecordSet('RecordSet', {
                    Name: 'name',
                    AliasTarget: {
                        DNSName: 'dns-name',
                        HostedZoneId: 'hosted-zone-id',
                    },
                    TTL: 'ttl',
                    Type: 'A',
                    ResourceRecords: ['record-1'],
                    HostedZoneId: 'hosted-zone-id',
                }).validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/Cannot specify TTL/);
            });
            it('should not validate if TTL and no ResourceRecords', function() {
                var validationResults = kosmoform.r53.RecordSet('RecordSet', {
                    Name: 'name',
                    Type: 'A',
                    HostedZoneId: 'hosted-zone-id',
                    TTL: 'ttl',
                }).validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/ResourceRecords must be set/);
            });
            it('should not validate if SetIdentifier and no ResourceRecords', function() {
                var validationResults = kosmoform.r53.RecordSet('RecordSet', {
                    Name: 'name',
                    Type: 'A',
                    HostedZoneId: 'hosted-zone-id',
                    SetIdentifier: 'set-identifier',
                }).validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/ResourceRecords must be set/);
            });
            it('should not validate if HostedZoneId or HostedZoneName not set', function() {
                var validationResults = kosmoform.r53.RecordSet('RecordSet', {
                    Name: 'name',
                    Type: 'A',
                }).validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(1);
                expect(validationResults).to.have.deep.property('errors[0]').and.match(/either HostedZoneName or HostedZoneId/);
            });
        });

    });

    describe('sqs', function() {

        describe('Queue', function() {
            it('should produce warning if QueueName set', function() {
                var resource = kosmoform.sqs.Queue('Queue', {
                    QueueName: 'queue-name',
                });
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(1);
                expect(validationResults).to.have.property('errors').and.be.length(0);
                expect(validationResults).to.have.deep.property('warnings[0]').and.match(/validation warning/);
            });
            it('should not warning if QueueName not set', function() {
                var resource = kosmoform.sqs.Queue('Queue', {});
                var validationResults = resource.validate();
                expect(validationResults).to.have.property('warnings').and.be.length(0);
                expect(validationResults).to.have.property('errors').and.be.length(0);
            });
        });

    });

});
