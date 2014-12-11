var config = require('./config')
    , novastl = require('novastl');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var bastion = novastl.Bastion({
    vpc: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'test-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

console.log(bastion.template.toJson());