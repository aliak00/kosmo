var _ = require('lodash')
    , AWSResource = require('../../lib/kosmoform/lib/aws-resource')
    , CFFunction = require('../../lib/kosmoform/lib/cf-function')
    , Parameter = require('../../lib/kosmoform/lib/parameter');

describe('kosmoform.CFFunction', function() {

    it('should have all keys as instances of CFFunction', function() {
        _.forEach(_.keys(CFFunction), name => {
            expect(CFFunction[name]()).to.be.instanceOf(CFFunction);
        });
    });

    describe('#ref()', function() {
        it('should use name if given AWSResource', function() {
            expect(CFFunction.ref(AWSResource('resource-name'))).to.deep.equal({
                Ref: 'resource-name',
            });
        });
        it('should set Ref as string value', function() {
            expect(CFFunction.ref('whatever')).to.deep.equal({
                Ref: 'whatever',
            });
        });
    });

});
