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
                expect(types.string.validate('a string')).to.be.true;
            });
            it('should validate a AWSResource', function() {
                expect(types.string.validate(AWSResource())).to.be.true;
            });
            it('should not validate other object', function() {
                expect(types.string.validate({})).to.be.false;
            });

            _.forEach(CloudFormationFunction, (fn, name) => {
                it('should validate ' + name + ' as CloudFormationFunction', function() {
                    expect(types.string.validate(fn())).to.be.true;
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
                expect(types.regex.validate(/regexp?/)).to.be.true;
            });
            it('should not validate non-regext', function() {
                expect(types.regex.validate(true)).to.be.false;
                expect(types.regex.validate(3)).to.be.false;
                expect(types.regex.validate({})).to.be.false;
                expect(types.regex.validate('s')).to.be.false;
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
                expect(types.boolean.validate(true)).to.be.true;
                expect(types.boolean.validate(false)).to.be.true;
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
        const enumType = types.enum('t1', 't2', 't3');
        ensureValidInterface(enumType);

        describe('#validate()', function() {
            it('should validate valid values', function() {
                expect(enumType.validate('t1')).to.be.true;
                expect(enumType.validate('t2')).to.be.true;
                expect(enumType.validate('t3')).to.be.true;
            });
            it('should not validate invalid values', function() {
                expect(enumType.validate('t4')).to.be.false;
                expect(enumType.validate('t5')).to.be.false;
                expect(enumType.validate('t6')).to.be.false;
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output string from enum value', function() {
                expect(enumType.toCloudFormationValue('t1')).to.be.a('string')
                    .and.equal('t1');
            });
        });
    });

    describe('range', function() {
        const rangeType = types.range(2, 8);
        ensureValidInterface(rangeType);

        describe('#validate()', function() {
            it('should validate valid values', function() {
                expect(rangeType.validate(3)).to.be.true;
                expect(rangeType.validate(5)).to.be.true;
                expect(rangeType.validate(6)).to.be.true;
            });
            it('should be inclusive valid values', function() {
                expect(rangeType.validate(2)).to.be.true;
                expect(rangeType.validate(8)).to.be.true;
            });
            it('should not validate invalid values', function() {
                expect(rangeType.validate(1)).to.be.false;
                expect(rangeType.validate(-10)).to.be.false;
                expect(rangeType.validate(7478)).to.be.false;
            });
            it('should not validate a non number', function() {
                expect(rangeType.validate('3')).to.be.false;
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
                expect(types.number.validate(3)).to.be.true;
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
                expect(types.cidr.validate('100.0.222.1/31')).to.be.true;
                expect(types.cidr.validate('10.3.0.255/31')).to.be.true;
                expect(types.cidr.validate('255.255.255.255/10')).to.be.true;
                expect(types.cidr.validate('127.0.5.1/3')).to.be.true;
            });
            it('should not validate invalid cidr', function() {
                expect(types.cidr.validate('10.0.0.1/33')).to.be.false;
                expect(types.cidr.validate('10.0.0.1')).to.be.false;
                expect(types.cidr.validate('10.0.0')).to.be.false;
                expect(types.cidr.validate('10.0.1/33')).to.be.false;
                expect(types.cidr.validate('256.0.0.1/10')).to.be.false;
            });
            it('should not validate non string', function() {
                expect(types.cidr.validate(3)).to.be.false;
                expect(types.cidr.validate(false)).to.be.false;
                expect(types.cidr.validate({})).to.be.false;
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
                    expect(types.protocol.validate(value)).to.be.true;
                });
            });
            it('should validate valid named protocols', function() {
                _.forEach(types.protocol.numberToNameMap, value => {
                    expect(types.protocol.validate(value)).to.be.true;
                });
            });
            it('should not validate invalid protocol', function() {
                expect(types.protocol.validate(-30)).to.be.false;
                expect(types.protocol.validate('hibbyjibby')).to.be.false;
            });
            it('should not validate invalid protocol', function() {
                expect(types.protocol.validate(true)).to.be.false;
                expect(types.protocol.validate({})).to.be.false;
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
                expect(types.tags.validate(3)).to.be.false;
            });
            it('should not validate invalid object', function() {
                expect(types.tags.validate({
                    Name: 4,
                })).to.be.false;
                expect(types.tags.validate({
                    Name: {
                        Value: 4,
                    },
                })).to.be.false;
                expect(types.tags.validate({
                    Name: {},
                })).to.be.false;
                expect(types.tags.validate({
                    Name: {
                        Value: 4,
                        UnsupportedOption: 'whatever',
                    },
                })).to.be.false;
            });
            it('should validate valid object', function() {
                expect(types.tags.validate({
                    Name: '4',
                })).to.be.true;
                expect(types.tags.validate({
                    Name: {
                        Value: '4',
                    },
                })).to.be.true;
                expect(types.tags.validate({
                    Name: {
                        Value: '4',
                        PropagateAtLaunch: true,
                    },
                })).to.be.true;
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
                expect(types.portrange.validate([1, 2])).to.be.true;
            });
            it('should validate non array', function() {
                expect(types.portrange.validate(3)).to.be.false;
                expect(types.portrange.validate(true)).to.be.false;
                expect(types.portrange.validate({})).to.be.false;
            });
            it('should validate valid port ranges', function() {
                expect(types.portrange.validate([1, 65535])).to.be.true;
                expect(types.portrange.validate([1000, 30293])).to.be.true;
                expect(types.portrange.validate([230, 5001])).to.be.true;
            });
            it('should not validate array of non length 2', function() {
                expect(types.portrange.validate([1, 2, 4])).to.be.false;
                expect(types.portrange.validate([1])).to.be.false;
                expect(types.portrange.validate([])).to.be.false;
            });
            it('should not validate invalid port ranges', function() {
                expect(types.portrange.validate([0, 65535])).to.be.false;
                expect(types.portrange.validate([1, 65536])).to.be.false;
                expect(types.portrange.validate([-50, 202020])).to.be.false;
                expect(types.portrange.validate([40, 10])).to.be.false;
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
                expect(types.jsonobject.validate(3)).to.be.false;
            });
            it('should not validate invalid json', function() {
                expect(types.jsonobject.validate('{"invalid":json}')).to.be.false;
            });
            it('should validate json', function() {
                expect(types.jsonobject.validate('{"valid":"json"}')).to.be.true;
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
                expect(types.emptymap.validate(3)).to.be.false;
                expect(types.emptymap.validate({a:1})).to.be.false;
                expect(types.emptymap.validate(true)).to.be.false;
                expect(types.emptymap.validate('s')).to.be.false;
                expect(types.emptymap.validate([])).to.be.false;
            });
            it('should validate empty object', function() {
                expect(types.emptymap.validate({})).to.be.true;
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
            it('should not validate non ref function object', function() {
                expect(refType.validate(CloudFormationFunction.join())).to.be.false;
                expect(refType.validate({})).to.be.false;
                expect(refType.validate(true)).to.be.false;
                expect(refType.validate(false)).to.be.false;
            });
            it('should validate empty object', function() {
                expect(refType.validate(CloudFormationFunction.ref(AWSResource()))).to.be.true;
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
        const objectType = types.object('object', {
            t1: types.number,
            t2: types.string,
        });
        ensureValidInterface(objectType);

        describe('#validate()', function() {
            it('should not validate non object', function() {
                expect(objectType.validate(3)).to.be.false;
                expect(objectType.validate('s')).to.be.false;
                expect(objectType.validate(false)).to.be.false;
            });
            it('should not validate object with incorrect properties', function() {
                expect(objectType.validate({x1: 4})).to.be.false;
                expect(objectType.validate({t1: true})).to.be.false;
                expect(objectType.validate({t2: 4})).to.be.false;
            });
            it('should validate object with correct properties', function() {
                expect(objectType.validate({t1: 4})).to.be.true;
                expect(objectType.validate({t2: 's'})).to.be.true;
                expect(objectType.validate({t1: 4, t2: 's'})).to.be.true;
            });
        });

        describe('#toCloudFormationValue()', function() {
            it('should output valid object data from string', function() {
                expect(objectType.toCloudFormationValue({t1: 4, t2: 's'}))
                    .to.deep.equal({t1: '4', t2: 's'});
            });
        });
    });

    describe('array', function() {
        ensureValidInterface(types.array(types.string));

        describe('#validate()', function() {
            it('should not validate non array', function() {
                const array = types.array(types.string);
                expect(array.validate({})).to.be.false;
                expect(array.validate(4)).to.be.false;
                expect(array.validate(true)).to.be.false;
            });
            it('should validate array of strings only', function() {
                const array = types.array(types.string);
                expect(array.validate(['a', 'b', 'c'])).to.be.true;
                expect(array.validate([1, 2, 3])).to.be.false;
            });
            it('should validate array of valid objects', function() {
                const custom = types.object('name', {
                    t1: types.number,
                    t2: types.string,
                });
                const array = types.array(custom);

                const o1 = {t1: 3, t2: 's'};
                const o2 = {t1: 1, t2: 'g'};
                const o3 = {t1: 3};
                const o4 = {t2: 's'};

                expect(array.validate([o1, o2])).to.be.true;
                expect(array.validate([o3, o4])).to.be.true;
                expect(array.validate([o1])).to.be.true;
                expect(array.validate([o1, o2, o3, o4])).to.be.true;
            });
            it('should not validate array of invalid objects', function() {
                const custom = types.object('name', {
                    t1: types.number,
                    t2: types.string,
                });
                const array = types.array(custom);

                const o1 = {t1: 's', t2: 's'};
                const o2 = {t1: 1, t2: 'g'};
                const o3 = {t2: 1};
                const o4 = {t3: 3};

                expect(array.validate([o1, o2])).to.be.false;
                expect(array.validate([o3, o4])).to.be.false;
                expect(array.validate([o3])).to.be.false;
                expect(array.validate([o1, o2, o3, o4])).to.be.false;
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
                    t1: types.number,
                    t2: types.string,
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
