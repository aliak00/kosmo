var Parameter = require('../../lib/kosmoform/lib/parameter');

describe('kosmoform.Parameter', function() {

    it('should not need new to be constructed', function () {
        const parameterName = 'parameter-name';
        const parameterType = 'String';
        const p1 = new Parameter(parameterName, parameterType);
        const p2 = Parameter(parameterName, parameterType);

        function check(p) {
            expect(p).to.be.a('object');
            expect(p).to.have.property('name').and.equal(parameterName);
            expect(p).to.have.property('properties').and.deep.equal({
                Type: parameterType,
            });
        }

        check(p1);
        check(p2);
    });

    it('should allow construction with object as second parameter', function() {
        const p1 = Parameter('parameter-name', {
            Type: 'String',
        });

        expect(p1.validate()).to.deep.equal({
            errors: [],
            warnings: [],
        });

        const p2 = Parameter('parameter-name', {});

        expect(p2.validate()).to.have.deep.property('errors[0]').and.match(/missing mandatory property Type/);
    });

    describe('#validate()', function() {
        it('should return empty warnings and errors object with no errors', function() {
            const p1 = Parameter('parameter-name', 'String');
            expect(p1.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
        });
        it('should error with missing name or value', function() {
            const p1 = Parameter('', 'String');
            expect(p1.validate()).to.have.deep.property('errors[0]').and.match(/name must be non-empty/);
            const p2 = Parameter('parameter-name', '');
            expect(p2.validate()).to.have.deep.property('errors[0]').and.match(/missing mandatory property Type/);
            const p3 = Parameter('', '');
            const validationResults = p3.validate();
            expect(validationResults).to.have.deep.property('errors[0]').and.match(/name must be non-empty/);
            expect(validationResults).to.have.deep.property('errors[1]').and.match(/missing mandatory property Type/);
        });
    });

    describe('#toObject()', function() {
        it('should return valid object', function() {
            const p1 = Parameter('parameter-name', 'String', {
                NoEcho: true,
                Description: 'description',
            });
            expect(p1.toObject()).to.deep.equal({
                Type: 'String',
                NoEcho: 'true',
                Description: 'description',
            });
        });
    });

});
