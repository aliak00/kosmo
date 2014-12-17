var config = require('./config')
    , novastl = require('novastl')
    , novaform = require('novaform');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnets: config.publicSubnets,
    privateSubnets: config.privateSubnets
});

var rds = novastl.Rds({
    vpc: vpc
});

var stack = novaform.Stack('mystack');
stack.add(vpc.toResourceGroup());
stack.add(rds.toResourceGroup());

console.log(stack.toJson());
