var novastl = require('novastl')
    , config = require('./config');

var comoyoVpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

console.log(comoyoVpc.template.toJson());












