var _ = require('lodash')
    , AWSResource = require('./lib/aws-resource')
    , CFFunction = require('./lib/cf-function')
    , fs = require('fs')
    , Output = require('./lib/output')
    , Parameter = require('./lib/parameter')
    , resources = require('./lib/resources')
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

    return CFFunction.join('', joins);
}

module.exports = _.extend({
    Stack: Stack,
    Resource: AWSResource,
    Output: Output,
    Parameter: Parameter,

    fn: CFFunction,

    loadUserDataFromFile: loadUserDataFromFile,

    refs: {
        StackName: CFFunction.ref('AWS::StackName'),
        StackId: CFFunction.ref('AWS::StackId'),
        Region: CFFunction.ref('AWS::Region'),
        AccountId: CFFunction.ref('AWS::AccountId'),
        NotificationARNs: CFFunction.ref('AWS::NotificationARNs'),
        NoValue: CFFunction.ref('AWS::NoValue'),
    },
}, resources);
