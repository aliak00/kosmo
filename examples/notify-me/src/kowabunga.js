var AWS = require("aws-sdk");

exports.handler = function(event, context) {
    console.log('Look Ma! An Event!', JSON.stringify(event, null, 2));
    context.succeed('Kowabunga!');
};
