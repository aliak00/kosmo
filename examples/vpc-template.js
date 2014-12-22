var novastl = require('novastl')
    , config = require('./config')('eu-central-1')
    , novaform = require('novaform')

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var stack = novaform.Stack();
stack.add(vpc.toResourceGroup())

console.log(stack.toJson());












