var util = require('util')
    , path = require('path');

var publicSubnetsMap = {
    'eu-west-1': {
        'eu-west-1a': '10.42.1.0/24',
        'eu-west-1b': '10.42.2.0/24'
    },
    'eu-central-1': {
        'eu-central-1a': '10.42.1.0/24',
        'eu-central-1b': '10.42.2.0/24'
    },
};

var privateSubnetsMap = {
    'eu-west-1': {
        'eu-west-1a': '10.42.3.0/24',
        'eu-west-1b': '10.42.4.0/24'
    },
    'eu-central-1': {
        'eu-central-1a': '10.42.3.0/24',
        'eu-central-1b': '10.42.4.0/24'
    },
};

var images = {
    'eu-west-1': 'ami-748e2903',
    'eu-central-1': 'ami-b43503a9'
};

function makeConfig(region){
    return {
        vpcCidrBlock: '10.42.0.0/16',
        publicSubnetsPerAz: publicSubnetsMap[region],
        privateSubnetsPerAz: privateSubnetsMap[region],
        genericImageId: images[region]
    }
}

var externalZone = 'pluto.novajs.io';
var internalZone = 'i.pluto.novajs.io';

module.exports = function(nova) {
    var setup = {
        name: 'setup',

        dependencies: [
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var eipa = nova.resources.ec2.EIP('RouterIpAZa', {
                Domain: 'vpc',
            });
            var eipb = nova.resources.ec2.EIP('RouterIpAZb', {
                Domain: 'vpc',
            });

            var externalHostedZone = nova.resources.r53.HostedZone('PlutoExternalZone', {
                Name: externalZone,
            });

            var internalHostedZone = nova.resources.r53.HostedZone('PlutoInternalZone', {
                Name: internalZone,
            });

            return {
                resources: [
                    eipa,
                    eipb,
                    externalHostedZone,
                    internalHostedZone,
                ],

                outputs: [
                    nova.resources.Output('routerIpAZa', eipa),
                    nova.resources.Output('routerIpAZb', eipb),
                    nova.resources.Output('externalHostedZoneName', externalZone),
                    nova.resources.Output('externalHostedZoneId', externalHostedZone),
                    nova.resources.Output('internalHostedZoneName', internalZone),
                    nova.resources.Output('internalHostedZoneId', internalHostedZone),
                ]
            };
        }
    };

    var infrastructure = {
        name: 'infrastructure',

        dependencies: [
            'setup',
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var config = makeConfig(this.region);

            var internalHostedZoneId = deps.setup.internalHostedZoneId;

            var vpc = nova.templates.Vpc({
                cidr: config.vpcCidrBlock,
                publicSubnetsPerAz: config.publicSubnetsPerAz,
                privateSubnetsPerAz: config.privateSubnetsPerAz
            });

            var nat = nova.templates.Nat({
                vpcId: vpc.vpcId,
                vpcCidrBlock: vpc.vpcCidrBlock,
                publicSubnets: vpc.publicSubnets,
                privateSubnets: vpc.privateSubnets,

                allowedSshCidr: '0.0.0.0/0',
                keyName: 'ddenis', // TODO: how do we want to bootstrap key pairs?
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            var bastion = nova.templates.Bastion({
                vpc: vpc,
                allowedSshCidr: '0.0.0.0/0',
                keyName: 'ddenis',
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            var bastionr53record = nova.resources.r53.RecordSet('BastionR53', {
                HostedZoneId: internalHostedZoneId,
                Type: 'A',
                Name: util.format('login.%s.', internalZone),
                TTL: '60',
                ResourceRecords: [
                    nova.resources.ref(bastion.elasticIp)
                ],
            });

            return {
                resources: [
                    vpc.toResourceGroup(),
                    nat.toResourceGroup(),
                    bastion.toResourceGroup(),
                    bastionr53record,
                ],

                outputs: [
                    nova.resources.Output('vpcId', vpc.vpc),
                    nova.resources.Output('privateSubnets', nova.resources.join(',', vpc.privateSubnets)),
                    nova.resources.Output('publicSubnets', nova.resources.join(',', vpc.publicSubnets)),
                    nova.resources.Output('natSecurityGroup', nat.securityGroup),
                    nova.resources.Output('bastionSecurityGroup', bastion.securityGroup),
                    nova.resources.Output('bastionHostname', bastionr53record),
                ],
            };
        }
    };

    var database = {
        name: 'database',

        dependencies: [
            'setup',
            'infrastructure',
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var region = this.region;
            var subnets = deps.infrastructure.privateSubnets.split(',');

            var internalHostedZoneId = deps.setup.internalHostedZoneId;

            var rds = nova.templates.Rds({
                name: 'prod',
                subnets: subnets,
                password: '12345678',
            });

            var r53record = nova.resources.r53.RecordSet('DbR53', {
                HostedZoneId: internalHostedZoneId,
                Type: 'CNAME',
                Name: util.format('prod.%s.', internalZone),
                TTL: '60',
                ResourceRecords: [
                    nova.resources.getAtt(rds.dbinstance, 'Endpoint.Address'),
                ],
            });

            return {
                resources: [
                    rds.toResourceGroup(),
                    r53record,
                ],

                outputs: [
                    nova.resources.Output('id', rds.dbinstance),
                    nova.resources.Output('dbaddress', nova.resources.getAtt(rds.dbinstance, 'Endpoint.Address')),
                    nova.resources.Output('dbport', nova.resources.getAtt(rds.dbinstance, 'Endpoint.Port')),
                    nova.resources.Output('hostname', r53record),
                ],
            };
        }
    };

    var ebapp = {
        name: 'app',

        dependencies: [
            'infrastructure',
            'database',
        ],

        region: 'eu-west-1',

        build: function(deps, options, done) {
            var applicationPath = path.join(__dirname, '..');
            nova.utils.createArchive('pluto', applicationPath, function(err, path) {
                if (err) {
                    return done(err);
                }
                nova.utils.deployArchive(path, function(err, archive) {
                    if (err) {
                        return done(err);
                    }

                    var result = build(archive.bucket, archive.key);
                    done(null, result);
                });
            });


            function build(bucket, key) {
                var vpcId = deps.infrastructure.vpcId;
                var publicSubnets = deps.infrastructure.publicSubnets.split(',');
                var privateSubnets = deps.infrastructure.privateSubnets.split(',');

                var bastionSecurityGroup = deps.infrastructure.bastionSecurityGroup;
                var natSecurityGroup = deps.infrastructure.natSecurityGroup;

                var externalHostedZoneId = deps.setup.externalHostedZoneId;

                var ebapp = nova.templates.EBApp({
                    vpcId: vpcId,
                    publicSubnets: publicSubnets,
                    privateSubnets: privateSubnets,
                    keyName: 'ddenis',
                    bastionSecurityGroup: bastionSecurityGroup,
                    natSecurityGroup: natSecurityGroup,
                    sourceBundle: {
                        S3Bucket: bucket,
                        S3Key: key,
                    },
                });

                var r53record = nova.resources.r53.RecordSet('PlutoR53', {
                    HostedZoneId: externalHostedZoneId,
                    Type: 'CNAME',
                    Name: util.format('pluto.%s.', externalZone),
                    TTL: '60',
                    ResourceRecords: [
                        nova.resources.getAtt(ebapp.environment, 'EndpointURL'),
                    ],
                });

                return {
                    resources: [
                        ebapp.toResourceGroup(),
                        r53record,
                    ],

                    outputs: [
                        nova.resources.Output('address', r53record),
                    ],
                };
            }
        }
    };

    var project = {
        name: 'pluto',

        components: [
            setup,
            infrastructure,
            database,
            ebapp,
        ],
    };

    return project;
};
