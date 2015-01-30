var util = require('util');

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

var publicZone = 'wowbox.telenor.io';
var internalZone = 'c.wowbox.telenor.io';

module.exports = function(novaform, novastl) {
    var setup = {
        name: 'setup',

        dependencies: [
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var eipa = novaform.ec2.EIP('RouterIpAZa', {
                Domain: 'vpc',
            });
            var eipb = novaform.ec2.EIP('RouterIpAZb', {
                Domain: 'vpc',
            });

            var wowboxHostedZone = novaform.r53.HostedZone('Wowbox', {
                Name: publicZone,
            });

            var internalHostedZone = novaform.r53.HostedZone('WowboxInternal', {
                Name: internalZone,
            });

            return {
                resourceGroups: [
                    eipa,
                    eipb,
                    wowboxHostedZone,
                    internalHostedZone,
                ],

                outputs: [
                    novaform.Output('RouterIpAZa', eipa),
                    novaform.Output('RouterIpAZb', eipb),
                    novaform.Output('wowboxHostedZoneId', wowboxHostedZone),
                    novaform.Output('internalHostedZoneId', internalHostedZone),
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

            var vpc = novastl.Vpc({
                cidr: config.vpcCidrBlock,
                publicSubnetsPerAz: config.publicSubnetsPerAz,
                privateSubnetsPerAz: config.privateSubnetsPerAz
            });

            var nat = novastl.Nat({
                vpcId: vpc.vpcId,
                vpcCidrBlock: vpc.vpcCidrBlock,
                publicSubnets: vpc.publicSubnets,
                privateSubnets: vpc.privateSubnets,

                allowedSshCidr: '0.0.0.0/0',
                keyName: 'ddenis', // TODO: how do we want to bootstrap key pairs?
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            var bastion = novastl.Bastion({
                vpc: vpc,
                allowedSshCidr: '0.0.0.0/0',
                keyName: 'ddenis',
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            var bastionr53record = novaform.r53.RecordSet('BastionR53', {
                HostedZoneId: internalHostedZoneId,
                Type: 'A',
                Name: util.format('login.%s.', internalZone),
                TTL: '60',
                ResourceRecords: [
                    novaform.ref(bastion.elasticIp)
                ],
            });

            return {
                resourceGroups: [
                    vpc.toResourceGroup(),
                    nat.toResourceGroup(),
                    bastion.toResourceGroup(),
                    bastionr53record,
                ],

                outputs: [
                    novaform.Output('vpcId', vpc.vpc),
                    novaform.Output('privateSubnets', novaform.join(',', vpc.privateSubnets)),
                    novaform.Output('publicSubnets', novaform.join(',', vpc.publicSubnets)),
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

            var rds = novastl.Rds({
                name: 'prod',
                subnets: subnets,
                password: '12345678',
            });

            var r53record = novaform.r53.RecordSet('DbR53', {
                HostedZoneId: internalHostedZoneId,
                Type: 'CNAME',
                Name: util.format('prod.%s.', internalZone),
                TTL: '60',
                ResourceRecords: [
                    novaform.getAtt(rds.dbinstance, 'Endpoint.Address'),
                ],
            });

            return {
                resourceGroups: [
                    rds.toResourceGroup(),
                    r53record,
                ],

                outputs: [
                    novaform.Output('DbId', rds.dbinstance),
                    novaform.Output('DbAddress', novaform.getAtt(rds.dbinstance, 'Endpoint.Address')),
                    novaform.Output('DbPort', novaform.getAtt(rds.dbinstance, 'Endpoint.Port')),
                ],
            };
        }
    };

    var project = {
        name: 'pluto',

        components: [
            setup,
            infrastructure,
            database,
        ],
    };

    return project;
};