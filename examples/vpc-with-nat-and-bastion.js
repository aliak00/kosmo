var config = require('./config')('eu-central-1')
    , novastl = require('novastl')
    , novaform = require('novaform');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnetsPerAz: config.publicSubnetsPerAz,
    privateSubnetsPerAz: config.privateSubnetsPerAz
});

var nat = novastl.Nat({
    vpc: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'stupid-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

var bastion = novastl.Bastion({
    vpc: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'stupid-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

var stack = novaform.Stack('mystack');
stack.add(vpc.toResourceGroup());
stack.add(bastion.toResourceGroup());
stack.add(nat.toResourceGroup());

console.log(stack.toJson());

