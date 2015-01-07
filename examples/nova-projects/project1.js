var _ = require('underscore');

module.exports = function(novaform, novastl) {

    var stack1 = {
        name: 'stack1',
        region: 'eu-central-1',
        build: function(dependencies) {
            var config = require('./config')(this.region);

            var vpc = novastl.Vpc({
                cidr: config.vpcCidrBlock,
                publicSubnetsPerAz: config.publicSubnetsPerAz,
                privateSubnetsPerAz: config.privateSubnetsPerAz
            });

            var nat = novastl.Nat({
                vpc: vpc,
                allowedSshCidr: '0.0.0.0/0',
                keyName: 'test-key-pair',
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
        components [
            stack1, 
            stack2
        ]
    };
}