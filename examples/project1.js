var novaform = require('novaform')
    , novastl = require('novastl')
    , _ = require('underscore');

var stack1 = {
    name: 'stack1',
    build: function(options) {
        var region = options.region;
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
    build: function(options) {
        var region = options.region;
        var config = require('./config')(region);
        var subnets = options.dependencies.stack1.privateSubnets.split(',');

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

module.exports = [stack1, stack2];