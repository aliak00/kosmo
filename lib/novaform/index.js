var AWSResource = require('./lib/awsresource')
    , Output = require('./lib/output')
    , fn = require('./lib/fn')
    , fs = require('fs')
    , Stack = require('./lib/stack')
    , Parameter = require('./lib/parameter');

function loadUserDataFromFile(filename, params) {
    var contents = fs.readFileSync(filename).toString();

    var re = /\{\{.*?\}\}/g;
    var lines = contents.split(re);
    var refs = contents.match(re);
    // For content like "hey {{there}} dude {{person}} from hell" you'd get:
    // lines: [ 'hey ', ' dude ', ' from hell' ]
    // refs: [ '{{there}}', '{{person}}' ]

    function refObject(ref) {
        // Get rid of {{ }}
        ref = ref.replace(/\{|\}/g, '').trim();

        if (ref.indexOf(':') > -1) {
            // Divide '"a":"b"' => ["a", "b"]
            var parts = ref.match(/"(.*?)"/g);
            // Remove quotes
            var left = parts[0].replace(/\"/g, '');
            var right = parts[1].replace(/\"/g, '');
            var obj = {};
            obj[left] = right;
            return obj;
        } else {
            if (ref in params) {
                return params[ref];
            }
            return '';
        }
    }

    if (!refs) {
        return contents;
    }

    var joins = [lines[0]];
    for (var i = 0; i < refs.length; ++i) {
        joins.push(refObject(refs[i]));
        joins.push(lines[i + 1]);
    }

    return fn.join('', joins);
}

module.exports = {
    Stack: Stack,
    Resource: AWSResource,
    Output: Output,
    Parameter: Parameter,

    // TODO: Deprecated, remove.
    AWSResource: AWSResource,

    asg: require('./lib/resources/asg'),
    cloudwatch: require('./lib/resources/cloudwatch'),
    eb: require('./lib/resources/elastic-beanstalk'),
    ec2: require('./lib/resources/ec2'),
    ec: require('./lib/resources/ec'),
    ecs: require('./lib/resources/ecs'),
    elb: require('./lib/resources/elb'),
    iam: require('./lib/resources/iam'),
    lambda: require('./lib/resources/lambda'),
    r53: require('./lib/resources/route53'),
    redshift: require('./lib/resources/redshift'),
    rds: require('./lib/resources/rds'),
    s3: require('./lib/resources/s3'),
    sqs: require('./lib/resources/sqs'),
    sns: require('./lib/resources/sns'),

    ref: fn.ref,
    join: fn.join,
    base64: fn.base64,
    getAtt: fn.getAtt,
    getAZs: fn.getAZs,

    fn: fn,

    loadUserDataFromFile: loadUserDataFromFile,

    refs: {
        StackName: fn.ref('AWS::StackName'),
        StackId: fn.ref('AWS::StackId'),
        Region: fn.ref('AWS::Region'),
        AccountId: fn.ref('AWS::AccountId'),
        NotificationARNs: fn.ref('AWS::NotificationARNs'),
        NoValue: fn.ref('AWS::NoValue'),
    },
}
