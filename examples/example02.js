var config = require('./config')
    , novastl = require('novastl');

var comoyoVpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var comoyoNat = novastl.Nat({
    vpc: comoyoVpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'test-key-pair',
    imageId: 'ami-b43503a9',
    instanceType: 't2.micro'
});

console.log(comoyoNat.template.toJson());