var _ = require('lodash')
    , resourceProducts = require('../../lib/kosmoform/lib/resources');

describe('kosmoform.resources', function() {
    _.forEach(resourceProducts, (product, productName) => {
        describe(productName, function() {
            _.forEach(product, (resource, resourceName) => {
                describe(resourceName, function() {
                    const theResource = resource('name');
                    it('should have valid types', function() {
                        _.forEach(theResource.type.propertyDefinitions, def => {
                            expect(def.type).to.be.a('object');
                        });
                    });
                });
            });
        });
    });
});
