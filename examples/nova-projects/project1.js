var _ = require('underscore');

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

    var stack1 = {
        name: 'stack1',
        region: 'eu-central-1',
        build: function(dependencies) {
            var config = makeConfig(this.region);

            var vpc = novastl.Vpc({
                cidr: config.vpcCidrBlock,
                publicSubnetsPerAz: config.publicSubnetsPerAz,
                privateSubnetsPerAz: config.privateSubnetsPerAz
            });

            var nat = novastl.Nat({
                vpc: vpc,
                allowedSshCidr: '0.0.0.0/0',
                keyName: 'stupid-key-pair',
                imageId: config.genericImageId,
                instanceType: 't2.micro'
            });

            var privateSubnetRefs = _.map(vpc.refs.private, function(az) {
                return az.subnet;
            });

            var vpcPrivateSubnetOutput = novaform.Output('privateSubnets', {
                Value: novaform.join(',', privateSubnetRefs),
                Description: 'Private subnets from ' + vpc.name
            });

            return {
                resourceGroups: [
                    vpc.toResourceGroup(),
                    nat.toResourceGroup()
                ],

                outputs: [
                    vpcPrivateSubnetOutput
                ]
            };
        }
    };

    var stack2 = {
        name: 'stack2',
        dependencies: [stack1],
        region: 'eu-central-1',
        build: function(dependencies) {
            var subnets = dependencies.stack1.privateSubnets.split(',');

            var rds = novastl.Rds({
                subnets: subnets
            });

            return {
                resourceGroups: [
                    rds.toResourceGroup()
                ]
            };
        }
    };

    return {
        name: 'project1',
        components: [
            stack1, 
            stack2
        ]
    };
}