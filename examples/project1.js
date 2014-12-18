var novaform = require('novaform')
    , novastl = require('novastl');

module.exports = function(region) {
    var config = require('./config')(region);

    var vpc = novastl.Vpc({
        cidr: config.vpcCidrBlock,
        publicSubnets: config.publicSubnets,
        privateSubnets: config.privateSubnets
    });

    var nat = novastl.Nat({
        vpc: vpc,
        allowedSshCidr: '0.0.0.0/0',
        keyName: 'test-key-pair',
        imageId: config.genericImageId,
        instanceType: 't2.micro'
    });

    return {
        stack1: {
            resourceGroups: [
                vpc.toResourceGroup()
            ]
        },

        stack2: {
            resourceGroups: [
                nat.toResourceGroup()
            ],
            dependencies: [
                'stack1'
            ]
        }
    }
};