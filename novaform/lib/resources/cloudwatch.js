var AWSResource = require('../awsresource')
    , types = require('../types');

var MetricDimensionType = types.object('cloudwatch-metric-dimension', {
    Name: types.string,
    Value: types.string,
});

var Alarm = AWSResource.define('AWS::CloudWatch::Alarm', {
    ActionsEnabled: { type: types.boolean },
    AlarmActions: { type: types.array },
    AlarmDescription: { type: types.string },
    AlarmName: { type: types.string },
    ComparisonOperator: { type: types.enum('GreaterThanOrEqualToThreshold', 'GreaterThanThreshold', 'LessThanThreshold', 'LessThanOrEqualToThreshold'), required: true },
    Dimensions : { type: types.array }, // array of MetricDimensionType
    EvaluationPeriods: { type: types.string, required: true },
    InsufficientDataActions: { type: types.array },
    MetricName: { type: types.string, required: true },
    Namespace: { type: types.string, required: true },
    OKActions: { type: types.array },
    Period: { type: types.string, required: true },
    Statistic: { type: types.enum('SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'), required: true },
    Threshold: { type: types.string, required: true },
    Unit: {
        type: types.enum(
            'Seconds', 'Microseconds', 'Milliseconds',
            'Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes',
            'Bits', 'Kilobits', 'Megabits', 'Gigabits', 'Terabits',
            'Percent',
            'Count',
            'Bytes/Second', 'Kilobytes/Second', 'Megabytes/Second', 'Gigabytes/Second', 'Terabytes/Second',
            'Bits/Second', 'Kilobits/Second',' Megabits/Second', 'Gigabits/Second', 'Terabits/Second',
            'Count/Second',
            'None',)
    },
}, {
    validator: function(props) {
        if (props && props.AlarmName) {
            console.log('Warning: specifying AlarmName (' + props.AlarmName + ') will disallow updates that require replacement.')
        }
    },
});

module.exports = {
    Alarm: Alarm,
};
