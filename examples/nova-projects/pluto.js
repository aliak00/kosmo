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

module.exports = function(novaform, novastl) {
    var infrastructure = {
        name: 'infrastructure',

        dependencies: [
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var config = makeConfig(this.region);

            var vpc = novastl.Vpc({
                cidr: config.vpcCidrBlock,
                publicSubnetsPerAz: config.publicSubnetsPerAz,
                privateSubnetsPerAz: config.privateSubnetsPerAz
            });

            var nat = novastl.Nat({
                vpc: vpc,
                allowedSshCidr: '0.0.0.0/0',
                keyName: 'ddenis', // TODO: how do we want to bootstrap key pairs?
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            return {
                resourceGroups: [
                    vpc.toResourceGroup(),
                    nat.toResourceGroup()
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
            'infrastructure',
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var region = this.region;
            var subnets = deps.infrastructure.privateSubnets.split(',');

            var rds = novastl.Rds({
                subnets: subnets
            });

            return {
                resourceGroups: [
                    rds.toResourceGroup()
                ],
            };
        }
    };

    var project = {
        name: 'pluto',

        components: [
            infrastructure,
            database,
        ],
    };

    return project;
};