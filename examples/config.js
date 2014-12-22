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

var images = {
    'eu-west-1': 'ami-748e2903',
    'eu-central-1': 'ami-b43503a9'
};

module.exports = function(region) {
    if (!publicSubnets[region]) {
        throw new Error('Unsupported public subnet region');
    }

    if (!privateSubnets[region]) {
        throw new Error('Unsupported private subnet region');
    }

    if (!images[region]) {
        throw new Error('Unsupported instance image subnet region');
    }

    return {
        vpcCidrBlock: '10.42.0.0/16',
        publicSubnets: publicSubnets[region],
        privateSubnets: privateSubnets[region],
        genericImageId: images[region]
    };
};