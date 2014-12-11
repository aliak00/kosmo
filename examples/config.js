var region = 'eu-west-1';

var publicSubnets = {
    'eu-west-1': {
        'eu-west-1a': '10.42.1.0/24',
        'eu-west-1b': '10.42.2.0/24'
    },
    'eu-central-1': {
        'eu-central-1a': '10.42.1.0/24',
        'eu-central-1b': '10.42.2.0/24'
    },
};

var privateSubnets = {
    'eu-west-1': {
        'eu-west-1a': '10.42.3.0/24',
        'eu-west-1b': '10.42.4.0/24'
    },
    'eu-central-1': {
        'eu-central-1a': '10.42.3.0/24',
        'eu-central-1b': '10.42.4.0/24'
    },
};

module.exports = {
    vpcCidrBlock: '10.42.0.0/0',
    publicSubnets: publicSubnets[region],
    privateSubnets: privateSubnets[region]
};