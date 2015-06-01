var Resource = require('./lib/resource')
    , Template = require('./lib/template')
    , Output = require('./lib/output')
    , TagValue = require('./lib/tag-value')
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
            return params[ref] || '';
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
    Resource: Resource,
    Template: Template,

    Output: Output,
    Parameter: Parameter,

    TagValue: TagValue,

    ec2: require('./lib/resources/ec2'),
    iam: require('./lib/resources/iam'),
    asg: require('./lib/resources/asg'),
    rds: require('./lib/resources/rds'),
    r53: require('./lib/resources/route53'),
    eb: require('./lib/resources/elastic-beanstalk'),
    s3: require('./lib/resources/s3'),
    ec: require('./lib/resources/ec'),

    ref: fn.ref,
    join: fn.join,
    base64: fn.base64,
    getAtt: fn.getAtt,

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
