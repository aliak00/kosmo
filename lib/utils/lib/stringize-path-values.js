var _ = require('lodash');

/*
{
    _: [
        'TopLevel1',
        'TopLevel2',
    ],
    One: {
        Two: [
            'X',
            'Y'
        ]
    },
    Another: [
        'Enum1',
        'Enum2',
    ],
};

Should output:
{
    One: {
        Two: {
            X: 'One::Two::X',
            Y: 'Obe::Two::Y',
        }
    },
    Another: {
        Enum1: 'Another::Enum1',
        Enum2: 'Another::Enum2',
    },
    TopLevel1: 'TopLevel1',
    TopLevel2: 'TopLevel2',
}

Where '::' is whatever delimiter is specified (default is '::')
*/

function stringizePathValues(def, delimiter) {
    delimiter = delimiter || '::';
    function impl(state, _def, path) {
        if (path === '_') {
            impl(state, _def, '');
        } else if (_.isArray(_def)) {
            _.each(_def, function(val) {
                var newpath = path ? path + '.' + val : val;
                _.set(state, newpath, newpath.replace(/\./g, delimiter));
            });
        } else {
            _.each(_def, function(val, key) {
                impl(state, val, path + '.' + key);
            });
        }
        return state;
    }

    return _.reduce(def, impl, {});
}

module.exports = stringizePathValues;
