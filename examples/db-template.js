var config = require('./config')('eu-central-1')
    , novastl = require('novastl')
    , novaform = require('novaform')
    , _ = require('underscore');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnetsPerAz: config.publicSubnetsPerAz,
    privateSubnetsPerAz: config.privateSubnetsPerAz
});

var privateSubnets = _.map(vpc.refs.private, function(az) {
    return az.subnet;
});

var rds = novastl.Rds({
    subnets: privateSubnets
});

var stack = novaform.Stack('mystack');
stack.add(vpc.toResourceGroup());
stack.add(rds.toResourceGroup());

console.log(stack.toJson());
