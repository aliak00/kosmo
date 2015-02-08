var Resource = require('./lib/resource')
    , Template = require('./lib/template')
    , Output = require('./lib/output')
    , TagValue = require('./lib/tag-value')
    , fn = require('./lib/fn')
    , fs = require('fs')
    , Stack = require('./lib/stack');

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
            if (!params || !params[ref]) {
                throw new Error('Expected value for ' + ref + ' in params');
            }
            return params[ref];
        }
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

    TagValue: TagValue,

    ec2: require('./lib/resources/ec2'),
    iam: require('./lib/resources/iam'),
    asg: require('./lib/resources/asg'),
    rds: require('./lib/resources/rds'),
    r53: require('./lib/resources/route53'),
    eb: require('./lib/resources/elastic-beanstalk'),

    ref: fn.ref,
    join: fn.join,
    base64: fn.base64,
    getAtt: fn.getAtt,

    loadUserDataFromFile: loadUserDataFromFile,

    refs: {
        StackName: fn.ref('AWS::StackName'),
        StackId: fn.ref('AWS::StackId')
    }
}
