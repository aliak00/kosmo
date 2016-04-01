var readline = require('readline')
    , util = require('util');

function yesorno(text) {
    return new Promise(function(resolve/*, reject*/) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(util.format('%s (yes|no): ', text), answer => {
            rl.close();
            if (answer === 'yes') {
                return resolve(true);
            }
            resolve(false);
        });
    });
};

module.exports = yesorno;
