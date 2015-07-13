var _ = require('underscore');

function EBOptionSettings(options) {
    /* options should be: {
        aws-eb-namespace: {
            aws-eb-namespace-option: aws-eb-namespace-value,
            aws-eb-namespace-option: aws-eb-namespace-value,
            ...
        },
        aws-eb-namespace: {
            aws-eb-namespace-option: aws-eb-namespace-value,
            aws-eb-namespace-option: aws-eb-namespace-value,
            ...
        },
        ...
    }

    Result is:
    [
        {
            Namespace: 'aws-eb-namespace',
            OptionName: 'aws-eb-namespace-option',
            Value: aws-eb-namespace-value,
        },
        {
            Namespace: 'aws-eb-namespace',
            OptionName: 'aws-eb-namespace-option',
            Value: aws-eb-namespace-value,
        },
        ...
    ]
    */

    return _.flatten(_.map(options, function(optionObject, namespace) {
        return _.map(optionObject, function(value, key) {
            return {
                Namespace: namespace,
                OptionName: key,
                Value: value,
            };
        });
    }));
}

module.exports = EBOptionSettings;
