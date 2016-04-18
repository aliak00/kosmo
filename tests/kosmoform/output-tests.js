var Output = require('../../lib/kosmoform/lib/output')
    , sinon = require('sinon')
    , types = require('../../lib/kosmoform/lib/types');

describe('kosmoform.Output', function() {

    it('should not need new to be constructed', function () {
        const outputName = 'output-name';
        const outputValue = 'output-value';
        const outputDescription = 'output-description';
        const o1 = new Output(outputName, outputValue, outputDescription);
        const o2 = Output(outputName, outputValue, outputDescription);

        function check(o) {
            expect(o).to.be.a('object');
            expect(o).to.have.property('name').and.equal(outputName);
            expect(o).to.have.property('properties').and.deep.equal({
                Value: outputValue,
                Description: outputDescription,
            });
        }

        check(o1);
        check(o2);
    });

    describe('#validate()', function() {
        it('should return empty warnings and errors object with no errors', function() {
            const o1 = Output('output-name', 'value');
            expect(o1.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
        });
        it('should error with missing name or value', function() {
            const o1 = Output('', 'value');
            expect(o1.validate()).to.have.deep.property('errors[0]').and.match(/name must be non-empty/);
            const o2 = Output('output-name', '');
            expect(o2.validate()).to.have.deep.property('errors[0]').and.match(/missing mandatory property Value/);
            const o3 = Output('', '');
            const validationResults = o3.validate();
            expect(validationResults).to.have.deep.property('errors[0]').and.match(/name must be non-empty/);
            expect(validationResults).to.have.deep.property('errors[1]').and.match(/missing mandatory property Value/);
        });
    });

    describe('#toObject()', function() {
        it('should return valid object', function() {
            const o1 = Output('output-name', 'value', 'description');
            expect(o1.toObject()).to.deep.equal({
                Value: 'value',
                Description: 'description',
            });
        });
    });

});
