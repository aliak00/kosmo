var AWSResource = require('../../lib/novaform/lib/aws-resource')
    , sinon = require('sinon')
    , types = require('../../lib/novaform/lib/types');

describe('novaform.AWSResource', function() {

    describe('#define()', function () {
        it('should return a function that creates an AWSResource', function() {
            var resource = AWSResource.define('type-name');
            expect(resource).to.be.a('function');
            expect(resource()).to.be.instanceof(AWSResource);
        });
        it('should not need new to be constructed', function () {
            function validator() {}
            const typeName = 'resource-type';
            const resourceName = 'resource-name';
            const resource = AWSResource.define(typeName, {}, { validator: validator });
            const r1 = new resource(resourceName);
            const r2 = resource(resourceName);

            function check(r) {
                expect(r).to.be.a('object');
                expect(r).to.have.property('name').and.equal(resourceName);
                expect(r).to.have.property('properties').and.deep.equal({});
                expect(r).to.have.property('validator').and.equal(validator);
                expect(r).to.have.property('attributes').and.be.undefined;
                expect(r).to.have.deep.property('type.name').and.equal(typeName);
            }

            check(r1);
            check(r2);
        });
    });

    describe('#validate()', function() {
        it('should return empty warnings and errors object with no errors', function() {
            const resource = AWSResource.define('resource-type');
            const r1 = resource('resource-name');
            expect(r1.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
        });
        it('should supply context to resource validator', function() {
            function validator(context) {
                expect(context).to.respondTo('addError');
                expect(context).to.respondTo('addWarning');
                expect(context).to.have.property('properties').and.deep.equal({ Prop1: 1 });
            }

            const resource = AWSResource.define('resource-type', {
                Prop1: { type: types.number },
            }, {
                validator: validator,
            });

            const r1 = resource('resource-name', { Prop1: 1 });

            expect(r1.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
        });
        it('should set correct errors/warnings with suplied validator', function() {
            function validator(context) {
                context.addWarning('friggin warning 1');
                context.addWarning('friggin warning 2');
                context.addError('friggin error 1');
                context.addError('friggin error 2');
            }

            const resource = AWSResource.define('resource-type', {
                Prop1: { type: types.number },
            }, {
                validator: validator,
            });

            const r1 = resource('resource-name', { Prop1: 1 });
            const validationResults = r1.validate();
            expect(validationResults).to.have.deep.property('warnings[0]').and.match(/friggin warning 1/);
            expect(validationResults).to.have.deep.property('warnings[1]').and.match(/friggin warning 2/);
            expect(validationResults).to.have.deep.property('errors[0]').and.match(/friggin error 1/);
            expect(validationResults).to.have.deep.property('errors[1]').and.match(/friggin error 2/);
        });
        it('should allow for multiple validators', function() {
            const v1 = sinon.spy();
            const v2 = sinon.spy();

            const resource = AWSResource.define('resource-type', {
                Prop1: { type: types.number },
            }, {
                validator: [v1, v2],
            });

            const r1 = resource('resource-name', { Prop1: 1 });
            r1.validate();

            expect(v1.calledOnce).to.be.true;
            expect(v2.calledOnce).to.be.true;
        });
        it('should catch unnamed resource', function() {
            const resource = AWSResource.define('resource-type', {
                Prop1: { type: types.number },
            });

            const r1 = resource('', { Prop1: 1 });
            const validationResults = r1.validate();
            expect(validationResults).to.have.deep.property('errors[0]')
                .and.match(/resource name/);
        });
        it('should catch type validation errors', function() {
            const resource = AWSResource.define('resource-type', {
                Prop1: { type: types.number },
            });

            const r1 = resource('resource-name', { Prop1: 's' });
            const validationResults = r1.validate();
            expect(validationResults).to.have.deep.property('errors[0]')
                .and.match(/in resource-type.Prop1 expected number/);
        });
    });

});
