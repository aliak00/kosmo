var config = require('./config')('eu-central-1')
    , novastl = require('novastl')
    , novaform = require('novaform')
    , _ = require('underscore');

var vpc = novastl.Vpc({
    cidr: config.vpcCidrBlock,
    publicSubnetsPerAz: config.publicSubnetsPerAz,
    privateSubnetsPerAz: config.privateSubnetsPerAz
});

var bastion = novastl.Bastion({
    vpc: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'stupid-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

var nat = novastl.Nat({
    vpc: vpc,
    allowedSshCidr: '0.0.0.0/0',
    keyName: 'stupid-key-pair',
    imageId: config.genericImageId,
    instanceType: 't2.micro'
});

var ebapp = novastl.EBApp({
    vpc: vpc.vpc,
    keyName: 'stupid-key-pair',
    bastionSecurityGroup: bastion.securityGroup,
    natSecurityGroup: nat.securityGroup,
    publicSubnets: vpc.publicSubnets,
    privateSubnets: vpc.privateSubnets,
    sourceBundle: {
        S3Bucket: 'aliak-comoyo-example',
        S3Key: 'nodejs-sample.zip'
    },
    dependsOn: nat.autoScalingGroup.name
});

var stack = novaform.Stack('mystack');
stack.add(vpc.toResourceGroup());
stack.add(bastion.toResourceGroup());
stack.add(nat.toResourceGroup());
stack.add(ebapp.toResourceGroup());

console.log(stack.toJson());