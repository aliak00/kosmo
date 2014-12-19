module.exports = function(novaform, novastl, options) {
    var _ = options.underscore;

    var infrastructure = {
        name: 'infrastructure',

        depends: [
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var config = require('./config')(this.region);

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
                ],
            };
        }
    };

    var database = {
        name: 'database',

        depends: [
            'infrastructure',
        ],

        region: 'eu-west-1',

        build: function(deps) {
            var region = this.region;
            var config = require('./config')(region);
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