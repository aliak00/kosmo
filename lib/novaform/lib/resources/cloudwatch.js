var AWSResource = require('../aws-resource')
    , types = require('../types');

var MetricDimensionType = types.object('MetricDimension', {
    Name: { type: types.string },
    Value: { type: types.string },
});

var Alarm = AWSResource.define('AWS::CloudWatch::Alarm', {
    ActionsEnabled: { type: types.boolean },
    AlarmActions: { type: types.array(types.string) },
    AlarmDescription: { type: types.string },
    AlarmName: { type: types.string },
    ComparisonOperator: { type: types.enum('GreaterThanOrEqualToThreshold', 'GreaterThanThreshold', 'LessThanThreshold', 'LessThanOrEqualToThreshold'), required: true },
    Dimensions : { type: types.array(MetricDimensionType) },
    EvaluationPeriods: { type: types.number, required: true },
    InsufficientDataActions: { type: types.array(types.string) },
    MetricName: { type: types.string, required: true },
    Namespace: { type: types.string, required: true },
    OKActions: { type: types.array(types.string) },
    Period: { type: types.number, required: true },
    Statistic: { type: types.enum('SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'), required: true },
    Threshold: { type: types.number, required: true },
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
            'None'),
    },
}, {
    validator: function(context) {
        if (context.properties.AlarmName) {
            context.addWarning('Warning: specifying AlarmName (' + context.properties.AlarmName + ') will disallow updates that require replacement.');
        }
    },
});

module.exports = {
    Alarm: Alarm,
};
