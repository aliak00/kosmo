var AWS = require("aws-sdk");

exports.handler = function(event, context) {
    console.log('Look Ma! An Event!', event);
    context.succeed('Kowabunga!');
};
