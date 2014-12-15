var config = require('./config')
    , novastl = require('novastl')
    , novaform = require('novaform');

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

var stack = novaform.Stack('mystack');
stack.add(vpc.template);
stack.add(nat.template);
console.log(stack.toJson());