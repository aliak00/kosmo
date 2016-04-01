var AWSResource = require('../../lib/novaform/lib/aws-resource');

describe('novaform.AWSResource', function() {

    describe('#define()', function () {

        it('should return an AWSResource constructor', function() {
            const Resource = AWSResource.define();
            assert(typeof Resource === 'function');
            assert(new Resource() instanceof AWSResource);
        });

        it('should not need new to be constructed', function () {
            const Resource = AWSResource.define();
            assert(Resource() instanceof AWSResource);
        });

        it('should allow aws resource type to be set', function() {
            const Resource = AWSResource.define('TypeValue');
            var res = Resource();
            expect(res).to.have.property('type').and.equal('TypeValue');
        });

    });

});
