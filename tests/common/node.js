require('use-strict');

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();

chai.use(chaiAsPromised);

global.expect = chai.expect;
global.assert = chai.assert;
