var config = require('./config')
    , novastl = require('novastl');

var comoyoVpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var comoyoRds = novastl.Rds({
    vpc: comoyoVpc
});

console.log(comoyoRds.template.toJson());
