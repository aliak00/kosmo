var AWSResource = require('../../lib/novaform/lib/aws-resource')

describe('AWSResource', function() {
    describe('#define()', function () {
        it('should return an AWSResource constructir', function () {
            const resource = AWSResource.define();
            assert(new resource() instanceof  AWSResource);
        });
    });
});
