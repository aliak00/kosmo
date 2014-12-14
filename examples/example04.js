var config = require('./config')
    , novastl = require('novastl');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var rds = novastl.Rds({
    vpc: vpc
});

console.log(rds.template.toJson());
