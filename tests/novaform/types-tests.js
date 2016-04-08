var _ = require('lodash')
    , AWSResource = require('../../lib/novaform/lib/aws-resource')
    , CloudFormationFunction = require('../../lib/novaform/lib/cloud-formation-function')
    , sinon = require('sinon')
    , types = require('../../lib/novaform/lib/types');

function ensureValidInterface(explicitType) {
    it('should have a name equal to itself', function() {
        const name = this.test.parent.title;
        const type = explicitType || types[name];
        expect(type).to.have.property('name', name);
    });
    it('should respond to validate', function() {
        const type = explicitType || types[this.test.parent.title];
        expect(type).to.respondTo('validate');
    });
    it('should respond to toCloudFormationValue', function() {
        const type = explicitType || types[this.test.parent.title];
        expect(type).to.respondTo('toCloudFormationValue');
    });
    it('should call ensureValueValid from toCloudFormationValue', function() {
        const original = types.ensureValueValid;
        const stub = sinon.stub();
        const type = explicitType || types[this.test.parent.title];
        types.ensureValueValid = stub;
        try { type.toCloudFormationValue(); } catch(e) {} // eslint-disable-line no-empty

        expect(stub.calledOnce).to.be.true;
        types.ensureValueValid = original;
    });
}

function ensureValid(result) {
    expect(result).to.equal(undefined);
}

function ensureNotValid(result, withMessage) {
    if (_.isUndefined(withMessage)) {
        expect(result).to.not.equal(undefined);
    } else if (typeof withMessage === 'string') {
        expect(result).to.equal(withMessage);
    } else if (withMessage instanceof RegExp) {
        expect(result).to.match(withMessage);
    } else if (withMessage instanceof Array) {
        _.forEach(withMessage, m => {
            ensureNotValid(m);
        });
    } else {
        throw new Error('Unknown withMessage type: ' + withMessage);
    }
}

describe('novaform.types', function() {

    describe('#ensureValueValid()', function() {
        it('should do nothing if valid valid', function() {
            expect(() => types.ensureValueValid(types.string, 's')).to.not.throw(Error);
        });
        it('should throw if value invalid', function() {
            expect(() => types.ensureValueValid(types.string, 3)).to.throw(Error);
        });
    });

    describe('string', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate a string', function() {
                ensureValid(types.string.validate('a string'));
            });
            it('should validate a AWSResource', function() {
                ensureValid(types.string.validate(AWSResource()));
            });
            it('should not validate other object', function() {
                ensureNotValid(types.string.validate({}));
            });

            _.forEach(CloudFormationFunction, (fn, name) => {
                it('should validate ' + name + ' as CloudFormationFunction', function() {
                    ensureValid(types.string.validate(fn()));
                });
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from string', function() {
                expect(types.string.toCloudFormationValue('s')).to.be.a('string')
                    .and.equal('s');
            });
            it('should output ref function from AWSResource', function() {
                expect(types.string.toCloudFormationValue(AWSResource()))
                    .to.be.instanceof(CloudFormationFunction.ref);
            });
        });

    });

    describe('regex', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate a regex', function() {
                ensureValid(types.regex.validate(/regexp?/));
            });
            it('should not validate non-regex', function() {
                ensureNotValid(types.regex.validate(true));
                ensureNotValid(types.regex.validate(3));
                ensureNotValid(types.regex.validate({}));
                ensureNotValid(types.regex.validate('s'));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from regex', function() {
                expect(types.regex.toCloudFormationValue(/regex?/)).to.be.a('string')
                    .and.equal('regex?');
            });
        });
    });

    describe('boolean', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate a boolean type', function() {
                ensureValid(types.boolean.validate(true));
                ensureValid(types.boolean.validate(false));
            });
            it('should not validate non-boolean', function() {
                ensureNotValid(types.boolean.validate(3));
                ensureNotValid(types.boolean.validate({}));
                ensureNotValid(types.boolean.validate('s'));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from boolean', function() {
                expect(types.boolean.toCloudFormationValue(true)).to.be.a('string')
                    .and.equal('true');
                expect(types.boolean.toCloudFormationValue(false)).to.be.a('string')
                    .and.equal('false');
            });
        });
    });

    describe('enum', function() {
        const enumType = types.enum();
        ensureValidInterface(enumType);

        it('should not create enum without string values', function() {
            expect(() => types.enum('t1', 3)).to.throw(Error);
        });

        describe('#validate()', function() {
            it('should validate valid values', function() {
                const enumType = types.enum('t1', 't2', 't3');
                ensureValid(enumType.validate('t1'));
                ensureValid(enumType.validate('t2'));
                ensureValid(enumType.validate('t3'));
            });
            it('should not validate invalid values', function() {
                const enumType = types.enum('t1', 't2', 't3');
                ensureNotValid(enumType.validate('t4'));
                ensureNotValid(enumType.validate('t5'));
                ensureNotValid(enumType.validate('t6'));
            });
            it('should not validate non string', function() {
                const enumType = types.enum('1', '2');
                ensureNotValid(enumType.validate(1));
                ensureNotValid(enumType.validate(2));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from enum value', function() {
                const enumType = types.enum('t1', 't2');
                expect(enumType.toCloudFormationValue('t1')).to.be.a('string')
                    .and.equal('t1');
                expect(enumType.toCloudFormationValue('t2')).to.be.a('string')
                    .and.equal('t2');
            });
        });
    });

    describe('range', function() {
        const rangeType = types.range(2, 8);
        ensureValidInterface(rangeType);

        describe('#validate()', function() {
            it('should validate valid values', function() {
                ensureValid(rangeType.validate(3));
                ensureValid(rangeType.validate(5));
                ensureValid(rangeType.validate(6));
            });
            it('should be inclusive valid values', function() {
                ensureValid(rangeType.validate(2));
                ensureValid(rangeType.validate(8));
            });
            it('should not validate invalid values', function() {
                ensureNotValid(rangeType.validate(1));
                ensureNotValid(rangeType.validate(-10));
                ensureNotValid(rangeType.validate(7478));
            });
            it('should not validate a non number', function() {
                ensureNotValid(rangeType.validate('3'));
                ensureNotValid(rangeType.validate({}));
                ensureNotValid(rangeType.validate(true));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output a string from number', function() {
                expect(rangeType.toCloudFormationValue(5)).to.be.a('string')
                    .and.equal('5');
            });
        });
    });

    describe('number', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate a number type', function() {
                ensureValid(types.number.validate(3));
            });
            it('should not validate a non number type', function() {
                ensureNotValid(types.number.validate(true));
                ensureNotValid(types.number.validate('s'));
                ensureNotValid(types.number.validate({}));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from number', function() {
                expect(types.number.toCloudFormationValue(5)).to.be.a('string')
                    .and.equal('5');
            });
        });
    });

    describe('cidr', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate a cidr', function() {
                ensureValid(types.cidr.validate('100.0.222.1/31'));
                ensureValid(types.cidr.validate('10.3.0.255/31'));
                ensureValid(types.cidr.validate('255.255.255.255/10'));
                ensureValid(types.cidr.validate('127.0.5.1/3'));
            });
            it('should not validate invalid cidr', function() {
                ensureNotValid(types.cidr.validate('10.0.0.1/33'));
                ensureNotValid(types.cidr.validate('10.0.0.1'));
                ensureNotValid(types.cidr.validate('10.0.0'));
                ensureNotValid(types.cidr.validate('10.0.1/33'));
                ensureNotValid(types.cidr.validate('256.0.0.1/10'));
            });
            it('should not validate non string', function() {
                ensureNotValid(types.cidr.validate(3));
                ensureNotValid(types.cidr.validate(false));
                ensureNotValid(types.cidr.validate({}));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from cidr', function() {
                expect(types.cidr.toCloudFormationValue('10.3.4.2/15')).to.be.a('string')
                    .and.equal('10.3.4.2/15');
            });
        });
    });

    describe('protocol', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate valid number protocols', function() {
                _.forEach(types.protocol.nameToNumberMap, value => {
                    ensureValid(types.protocol.validate(value));
                });
            });
            it('should validate valid named protocols', function() {
                _.forEach(types.protocol.numberToNameMap, value => {
                    ensureValid(types.protocol.validate(value));
                });
            });
            it('should not validate invalid protocol', function() {
                ensureNotValid(types.protocol.validate(-30));
                ensureNotValid(types.protocol.validate('hibbyjibby'));
                ensureNotValid(types.protocol.validate(true));
                ensureNotValid(types.protocol.validate({}));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output protocol as string', function() {
                expect(types.protocol.toCloudFormationValue(-1)).to.be.a('string')
                    .and.equal('-1');
                expect(types.protocol.toCloudFormationValue('all')).to.be.a('string')
                    .and.equal('-1');
                expect(types.protocol.toCloudFormationValue(6)).to.be.a('string')
                    .and.equal('6');
                expect(types.protocol.toCloudFormationValue('tcp')).to.be.a('string')
                    .and.equal('6');
            });
        });

        describe('#valueAsName()', function() {
            it('should output name from number', function() {
                expect(types.protocol.valueAsName(-1)).to.be.a('string')
                    .and.equal('all');
            });
            it('should output name from name', function() {
                expect(types.protocol.valueAsName('tcp')).to.be.a('string')
                    .and.equal('tcp');
            });
        });
    });

    describe('tags', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should not validate non object', function() {
                ensureNotValid(types.tags.validate(3));
                ensureNotValid(types.tags.validate(true));
                ensureNotValid(types.tags.validate('s'));
            });
            it('should validate valid values', function() {
                ensureValid(types.tags.validate({
                    Name: 's',
                }));
                ensureValid(types.tags.validate({
                    Name: CloudFormationFunction.Base(),
                }));
                ensureValid(types.tags.validate({
                    Name: AWSResource(),
                }));
                ensureValid(types.tags.validate({
                    Name: {
                        Value: 's',
                    },
                }));
            });
            it('should not validate object with no value', function() {
                ensureNotValid(types.tags.validate({
                    Name: {
                        Value: {},
                    },
                }));
                ensureNotValid(types.tags.validate({
                    Name: {},
                }));
            });
            it('should not validate invalid option name', function() {
                ensureNotValid(types.tags.validate({
                    Name: {
                        Value: 's',
                        UnsupportedOption: 'whatever',
                    },
                }));
            });
            it('should not validate invalid option value', function() {
                ensureNotValid(types.tags.validate({
                    Name: {
                        Value: 's',
                        PropagateAtLaunch: 'whatever',
                    },
                }));
            });
            it('should validate valid object', function() {
                ensureValid(types.tags.validate({
                    Name: '4',
                }));
                ensureValid(types.tags.validate({
                    Name: {
                        Value: '4',
                    },
                }));
                ensureValid(types.tags.validate({
                    Name: {
                        Value: '4',
                        PropagateAtLaunch: true,
                    },
                }));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid tag object with single value', function() {
                expect(types.tags.toCloudFormationValue({
                    TagName1: 'TagValue1',
                })).to.deep.equal(
                    [
                        {
                            Key: 'TagName1',
                            Value: 'TagValue1',
                        },
                    ]
                );
            });
            it('should output valid tag object with value and AWSResource', function() {
                expect(types.tags.toCloudFormationValue({
                    TagName1: 'TagValue1',
                    TagName2: AWSResource(),
                })).to.deep.equal(
                    [
                        {
                            Key: 'TagName1',
                            Value: 'TagValue1',
                        },
                        {
                            Key: 'TagName2',
                            Value: AWSResource(),
                        },
                    ]
                );
            });
            it('should output valid tag object with CloudFormationFunction and extra options', function() {
                expect(types.tags.toCloudFormationValue({
                    TagName1: AWSResource(),
                    TagName2: {
                        Value: CloudFormationFunction.Base(),
                        PropagateAtLaunch: true,
                    },
                })).to.deep.equal(
                    [
                        {
                            Key: 'TagName1',
                            Value: AWSResource(),
                        },
                        {
                            Key: 'TagName2',
                            Value: CloudFormationFunction.Base(),
                            PropagateAtLaunch: 'true',
                        },
                    ]
                );
            });
        });
    });

    describe('portrange', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should validate array of length 2', function() {
                ensureValid(types.portrange.validate([1, 2]));
            });
            it('should not validate non array', function() {
                ensureNotValid(types.portrange.validate(3));
                ensureNotValid(types.portrange.validate(true));
                ensureNotValid(types.portrange.validate({}));
            });
            it('should validate valid port ranges', function() {
                ensureValid(types.portrange.validate([1, 65535]));
                ensureValid(types.portrange.validate([1000, 30293]));
                ensureValid(types.portrange.validate([230, 5001]));
            });
            it('should not validate array of non length 2', function() {
                ensureNotValid(types.portrange.validate([1, 2, 4]));
                ensureNotValid(types.portrange.validate([1]));
                ensureNotValid(types.portrange.validate([]));
            });
            it('should not validate invalid port ranges', function() {
                ensureNotValid(types.portrange.validate([0, 65535]));
                ensureNotValid(types.portrange.validate([1, 65536]));
                ensureNotValid(types.portrange.validate([-50, 202020]));
                ensureNotValid(types.portrange.validate([40, 10]));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid port object', function() {
                expect(types.portrange.toCloudFormationValue([1, 2]))
                    .to.deep.equal({
                        From: '1',
                        To: '2',
                    });
            });
        });
    });

    describe('jsonobject', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should not validate non object non string', function() {
                ensureNotValid(types.jsonobject.validate(3));
            });
            it('should not validate invalid json', function() {
                ensureNotValid(types.jsonobject.validate('{"invalid":json}'));
            });
            it('should validate json', function() {
                ensureValid(types.jsonobject.validate('{"valid":"json"}'));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid json data from string', function() {
                expect(types.jsonobject.toCloudFormationValue('{"some":{"json":{"object":true}}}'))
                    .to.deep.equal({
                        some: {
                            json: {
                                object: true,
                            },
                        },
                    });
            });
            it('should output valid json data from object', function() {
                var obj = {
                    some: {
                        json: {
                            object: true,
                        },
                    },
                };
                expect(types.jsonobject.toCloudFormationValue(obj))
                    .to.deep.equal(obj);
            });
        });
    });

    describe('emptymap', function() {
        ensureValidInterface();

        describe('#validate()', function() {
            it('should not validate a non empty', function() {
                ensureNotValid(types.emptymap.validate(3));
                ensureNotValid(types.emptymap.validate({a:1}));
                ensureNotValid(types.emptymap.validate(true));
                ensureNotValid(types.emptymap.validate('s'));
                ensureNotValid(types.emptymap.validate([]));
            });
            it('should validate empty object', function() {
                ensureValid(types.emptymap.validate({}));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output empty object', function() {
                expect(types.emptymap.toCloudFormationValue({}))
                    .to.deep.equal({});
            });
        });
    });

    describe('ref', function() {
        const refType = types.ref('AWS::Type');
        ensureValidInterface(refType);

        describe('#validate()', function() {
            it('should not validate AWSResource and ref function', function() {
                ensureValid(refType.validate(CloudFormationFunction.ref()));
                ensureValid(refType.validate(AWSResource()));
            });
            it('should not validate non ref function object', function() {
                ensureNotValid(refType.validate(CloudFormationFunction.join()));
                ensureNotValid(refType.validate({}));
                ensureNotValid(refType.validate(true));
                ensureNotValid(refType.validate(false));
            });
            it('should validate empty object', function() {
                ensureValid(refType.validate(CloudFormationFunction.ref(AWSResource())));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output ref object', function() {
                expect(refType.toCloudFormationValue(CloudFormationFunction.ref(AWSResource())))
                    .to.deep.equal(CloudFormationFunction.ref(AWSResource()));
            });
        });
    });

    describe('object', function() {
        // call it object because ensureValidInterface checks that .name is correct
        // by inspecting the test's describe title
        ensureValidInterface(types.object('object', {
            t1: { type: types.number },
        }));

        const objectType = types.object('type-name', {
            t1: { type: types.number },
            t2: { type: types.string },
        });

        it('should not create object without type name', function() {
            expect(() => types.object()).to.throw(Error);
        });

        it('should not create object without type definition', function() {
            expect(() => types.object('hi', {something: {}})).to.throw(Error);
        });

        describe('#validate()', function() {
            it('should not validate non object', function() {
                ensureNotValid(objectType.validate(3), /^in type-name expected object/);
                ensureNotValid(objectType.validate('s'), /^in type-name expected object/);
                ensureNotValid(objectType.validate(false), /^in type-name expected object/);
            });
            it('should not validate object with incorrect properties', function() {
                ensureNotValid(objectType.validate({x1: 4}), /^in type-name unexpected property x1/);
                ensureNotValid(objectType.validate({x1: 4, x2: 3}), /^in type-name unexpected properties x1, x2/);
                ensureNotValid(objectType.validate({t1: true}), /^in type-name.t1 expected number/);
                ensureNotValid(objectType.validate({t2: 4}), /^in type-name.t2 expected string/);
            });
            it('should validate object with correct properties', function() {
                ensureValid(objectType.validate({t1: 4}));
                ensureValid(objectType.validate({t2: 's'}));
                ensureValid(objectType.validate({t1: 4, t2: 's'}));
            });
            it('should validate empty object', function() {
                const object = types.object('type-name');
                ensureValid(object.validate({}));
            });
            it('should not validate missing required properties', function() {
                const object = types.object('type-name', {
                    t1: { type: types.number },
                    t2: { type: types.string, required: true },
                });
                ensureNotValid(object.validate({t1: 4}));
            });
            it('should work on objects with inner objects', function() {
                const object = types.object('type-name-1', {
                    t1: { type: types.number },
                    t2: { type: types.object('type-name-2', {
                        t3: { type: types.number },
                    })},
                });
                ensureValid(object.validate({
                    t1: 1,
                    t2: {
                        t3: 2,
                    },
                }));
                ensureNotValid(object.validate({
                    t1: 1,
                    t2: {
                        t3: 's',
                    },
                }), /^in type-name-1.t2 in type-name-2.t3 expected number/);
                ensureNotValid(object.validate({
                    t1: 1,
                    t2: {
                        t4: 4,
                    },
                }), /^in type-name-1.t2 unexpected property/);
            });
            it('should work on objects with inner arrays', function() {
                const object = types.object('type-name', {
                    t1: { type: types.number },
                    t2: { type: types.array(types.number) },
                });
                ensureValid(object.validate({
                    t1: 1,
                    t2: [1, 2, 3],
                }));
                ensureNotValid(object.validate({
                    t1: 1,
                    t2: [1, 2, 's'],
                }), /^in type-name.t2 in \[2\] expected number/);
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid object data from string', function() {
                expect(objectType.toCloudFormationValue({t1: 4, t2: 's'}))
                    .to.deep.equal({t1: '4', t2: 's'});
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid empty object', function() {
                const object = types.object('name');
                expect(object.toCloudFormationValue({}))
                    .to.deep.equal({});
            });
        });
    });

    describe('array', function() {
        ensureValidInterface(types.array(types.string));

        describe('#validate()', function() {
            it('should not validate non array', function() {
                const array = types.array(types.string);
                ensureNotValid(array.validate({}));
                ensureNotValid(array.validate(4));
                ensureNotValid(array.validate(true));
            });
            it('should validate array of strings', function() {
                const array = types.array(types.string);
                ensureValid(array.validate(['a', 'b', 'c']));
                ensureNotValid(array.validate([1]), /^in \[0\] expected string/);
                ensureNotValid(array.validate(['1', '2', 3]), /^in \[2\] expected string/);
            });
            it('should validate array of valid objects', function() {
                const custom = types.object('type-name', {
                    t1: { type: types.number },
                    t2: { type: types.string },
                });
                const array = types.array(custom);

                const o1 = {t1: 3, t2: 's'};
                const o2 = {t1: 1, t2: 'g'};
                const o3 = {t1: 3};
                const o4 = {t2: 's'};

                ensureValid(array.validate([o1, o2]));
                ensureValid(array.validate([o3, o4]));
                ensureValid(array.validate([o1]));
                ensureValid(array.validate([o1, o2, o3, o4]));
            });
            it('should not validate array of invalid objects', function() {
                const custom = types.object('type-name', {
                    t1: { type: types.number },
                    t2: { type: types.string },
                });
                const array = types.array(custom);

                const v1 = {t1: 1, t2: 's'};
                const v2 = {t2: 's'};
                const o1 = {t1: 's', t2: 's'};
                const o2 = {t1: 1, t2: 1};
                const o3 = {t3: 3};
                const o4 = {t3: 3, t4: 3};
                ensureNotValid(array.validate([o1, o2]), [
                    /^in \[0\] in type-name expected number/,
                    /^in \[1\] in type-name expected string/,
                ]);
                ensureNotValid(array.validate([v1, o2]), /^in \[1\] in type-name.t2 expected string/);
                ensureNotValid(array.validate([v1, v2, o3]), /^in \[2\] in type-name unexpected property t3/);
                ensureNotValid(array.validate([o4]), /^in \[0\] in type-name unexpected properties t3, t4/);
                ensureNotValid(array.validate([o1, o2, o3]), [
                    /^in \[0\] type-name.t1 expected number/,
                    /^in \[0\] type-name.t2 expected string/,
                    /^in \[2\] type-name unexpected property t3/,
                ]);
            });
            it('should work with array of arrays', function() {
                const array = types.array(types.array(types.number));
                ensureValid(array.validate([[1, 2], [3, 4], [5, 6]]));
                ensureNotValid(array.validate([[1, 2], true, [5, 6]]), /^in \[1\] expected array/);
                ensureNotValid(array.validate([[1, 2], [3, 4], [5, 's']]), /^in \[2\] in \[1\] expected number/);
            });
            it('should work with array of objects with arrays', function() {
                const object = types.object('type-name', {
                    t1: { type: types.array(types.number) },
                })
                const array = types.array(object);

                ensureValid(array.validate([{t1: [1, 2]}, {t1: [3, 4]}]));
                ensureNotValid(array.validate([{t1: [1, 2]}, {t1: [1, true]}]), /^in \[1\] in type-name.t1 in \[1\] expected number/);
                ensureNotValid(array.validate([{t1: [1, 2]}, {t3: [3, 4]}]));
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid string array', function() {
                const array = types.array(types.string);
                expect(array.toCloudFormationValue(['a', 'b', 'c']))
                    .to.deep.equal(['a', 'b', 'c']);
            });
            it('should output valid object array', function() {
                const custom = types.object('name', {
                    t1: { type: types.number },
                    t2: { type: types.string },
                });
                const array = types.array(custom);
                expect(array.toCloudFormationValue(
                    [
                        {
                            t1: 3,
                            t2: 's',
                        },
                        {
                            t1: 1,
                            t2: 'g',
                        },
                    ]))
                .to.deep.equal(
                    [
                        {
                            t1: '3',
                            t2: 's',
                        },
                        {
                            t1: '1',
                            t2: 'g',
                        },
                    ]);
            });
        });
    });

});
