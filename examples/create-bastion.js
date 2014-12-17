var config = require('./config')
    , novastl = require('novastl')
    , novaform = require('novaform');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var bastion = novastl.Bastion({
    vpcTemplate: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'test-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

var stack = novaform.Stack('mystack');
stack.add(vpc.resourceGroup);
stack.add(bastion.resourceGroup);

console.log(stack.toJson());

