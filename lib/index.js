var commands = require('./commands')
    , fs = require('fs')
    , path = require('path');

var nova = {};
nova.commands = commands;

try {
    var packagPath = path.join(__dirname, '../package.json');
    var packageJson = JSON.parse(fs.readFileSync(packagPath));
    nova.version = packageJson.version;
} catch (e) {
    console.log('Error reading verison out of package.json - ', e);
    nova.version = e;
}
module.exports = nova;
