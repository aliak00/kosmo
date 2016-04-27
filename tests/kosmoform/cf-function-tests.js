var _ = require('lodash')
    , AWSResource = require('../../lib/kosmoform/lib/aws-resource')
    , CFFunction = require('../../lib/kosmoform/lib/cf-function')
    , Parameter = require('../../lib/kosmoform/lib/parameter');

describe('kosmoform.CFFunction', function() {

    it('should have all keys as instances of CFFunction', function() {
        _.forEach(_.keys(CFFunction), name => {
            if (typeof CFFunction[name] === 'symbol') {
                return;
            }
            expect(CFFunction[name]()).to.be.instanceOf(CFFunction);
        });
    });

    describe('#ref()', function() {
        it('should use name if given AWSResource', function() {
            expect(CFFunction.ref(AWSResource('resource-name'))).to.deep.equal({
                Ref: 'resource-name',
            });
        });
        it('should use name if given Parameter', function() {
            expect(CFFunction.ref(Parameter('parameter-name'))).to.deep.equal({
                Ref: 'parameter-name',
            });
        });
        it('should set Ref as string value', function() {
            expect(CFFunction.ref('whatever')).to.deep.equal({
                Ref: 'whatever',
            });
        });
    });

    describe('#join()', function() {
        it('should join values with delim', function() {
            expect(CFFunction.join('delim', [1, 2, 3])).to.deep.equal({
                'Fn::Join': [
                    'delim',
                    [1, 2, 3],
                ],
            });
        });
        it('should join values with AWSResource and CFFunction.ref', function() {
            expect(CFFunction.join('delim', [
                CFFunction.ref('whatever'),
                AWSResource('resource-name'),
            ])).to.deep.equal({
                'Fn::Join': [
                    'delim',
                    [
                        { Ref: 'whatever' },
                        { Ref: 'resource-name' },
                    ],
                ],
            });
        });
    });

});
