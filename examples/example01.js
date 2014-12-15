var novastl = require('novastl')
    , config = require('./config')

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

console.log(vpc.template.toJson());












