var kosmoform = require('../../lib/kosmoform/');

function json(fileName) {
    const data = require(fileName);
    return JSON.stringify(data, null, 2);
}
describe('kosmoform.Stack', function() {

    describe('#add()', function() {
        it('should allow adding arrays and objects', function() {
            var stack = new kosmoform.Stack('stack-name');
            const oneResource = kosmoform.s3.Bucket('Bucket');
            const arrayOfResources = [
                kosmoform.s3.Bucket('Bucket1'),
                kosmoform.s3.Bucket('Bucket2'),
            ];
            expect(() => stack.add(oneResource)).to.not.throw(Error);
            expect(() => stack.add(arrayOfResources)).to.not.throw(Error);
        });
        it('should accept AWSResource, Parameter and Output only', function() {
            var stack = new kosmoform.Stack('stack-name');
            expect(() => stack.add(kosmoform.s3.Bucket('Bucket'))).to.not.throw(Error);
            expect(() => stack.add(kosmoform.Parameter('parameter-name'))).to.not.throw(Error);
            expect(() => stack.add(kosmoform.Output('output-name'))).to.not.throw(Error);
            expect(() => stack.add({})).to.throw(Error);
        });
        it('should not allow duplicates', function() {
            var stack = new kosmoform.Stack('stack-name');
            expect(() => stack.add(kosmoform.s3.Bucket('Bucket'))).to.not.throw(Error);
            expect(() => stack.add(kosmoform.s3.Bucket('Bucket'))).to.throw(Error, 'Cannot add duplicate');

            expect(() => stack.add(kosmoform.Parameter('parameter-name'))).to.not.throw(Error);
            expect(() => stack.add(kosmoform.Parameter('parameter-name'))).to.throw(Error, 'Cannot add duplicate');

            expect(() => stack.add(kosmoform.Output('output-name'))).to.not.throw(Error);
            expect(() => stack.add(kosmoform.Output('output-name'))).to.throw(Error, 'Cannot add duplicate');

            expect(() => stack.add({})).to.throw(Error);
        });
    });

    describe('#isEmpty()', function() {
        it('should return true for empty stack unless a resource is inside', function() {
            var stack = new kosmoform.Stack();
            expect(stack.isEmpty()).to.be.true;

            stack.add(kosmoform.Output());
            expect(stack.isEmpty()).to.be.true;

            stack.add(kosmoform.Parameter());
            expect(stack.isEmpty()).to.be.true;

            stack.add(kosmoform.Resource());
            expect(stack.isEmpty()).to.be.false;
        });
    });

    describe('#validate()', function() {
        it('should return array of errors and warnings', function() {
            var stack = new kosmoform.Stack();
            stack.add(kosmoform.s3.Bucket('Bucket'));
            expect(stack.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
        });
    });

    describe('#toJson()', function () {
        it('should create valid empty stack template', function() {
            const stack = new kosmoform.Stack('stack-name', 'stack-description');

            expect(stack.toJson()).to.equal(json('./json-templates/empty-template.json'));
        });
        it('should create valid template with s3 bucket', function() {
            const bucket = kosmoform.s3.Bucket('Bucket', {
                BucketName: 'bucket-name',
                AccessControl: 'Private',
            });

            const stack = new kosmoform.Stack('stack-name', 'stack-description');
            stack.add(bucket);


            expect(stack.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
            expect(stack.toJson()).to.equal(json('./json-templates/s3-bucket-template.json'));
        });
        it('should create valid rds stack', function() {
            const securityGroup = kosmoform.ec2.SecurityGroup('SecurityGroup', {
                VpcId: 'vpc-id',
                GroupDescription: 'description',
            });

            const sgi = kosmoform.ec2.SecurityGroupIngress('DbSgi', {
                GroupId: securityGroup,
                IpProtocol: 'tcp',
                FromPort: 5432,
                ToPort: 5432,
                CidrIp: '0.0.0.0/0',
            });

            const subnetGroup = kosmoform.rds.DBSubnetGroup('DbSubnetGroup', {
                DBSubnetGroupDescription: 'description',
                SubnetIds: ['public-subnets'],
                Tags: {
                    Application: kosmoform.refs.StackId,
                    Name: kosmoform.fn.join('-', [kosmoform.refs.StackName, 'DbSubnetGroup']),
                },
            });

            const dbinstance = kosmoform.rds.DBInstance('DbInstance', {
                AllocatedStorage: 10,
                DBInstanceClass: 'instance-type',
                DBSubnetGroupName: subnetGroup,
                Engine: 'postgres',
                EngineVersion: '9.3.5',
                MasterUsername: 'username',
                MasterUserPassword: kosmoform.fn.ref('DatabasePassword'),
                BackupRetentionPeriod: 7,
                PubliclyAccessible: true,
                VPCSecurityGroups: [securityGroup],
                MultiAZ: false,
                Tags: {
                    Application: kosmoform.refs.StackId,
                    Name: kosmoform.fn.join('-', [kosmoform.refs.StackName, 'DbInstance']),
                },
            });

            const r53record = kosmoform.r53.RecordSet('DbR53', {
                HostedZoneId: 'external-hosted-zone-id',
                Type: 'CNAME',
                Name: 'db.external-zone',
                TTL: '60',
                ResourceRecords: [
                    kosmoform.fn.getAtt(dbinstance, 'Endpoint.Address'),
                ],
            });

            const stack = new kosmoform.Stack('stack-name', 'stack-description');

            stack.add([
                securityGroup,
                sgi,
                subnetGroup,
                dbinstance,
                r53record,
            ]);
            stack.add([
                kosmoform.Output('id', dbinstance),
                kosmoform.Output('dbaddress', kosmoform.fn.getAtt(dbinstance, 'Endpoint.Address')),
                kosmoform.Output('dbport', kosmoform.fn.getAtt(dbinstance, 'Endpoint.Port')),
                kosmoform.Output('hostname', r53record),
            ]);
            stack.add([
                kosmoform.Parameter('DatabasePassword', {
                    Type: 'String',
                    NoEcho: true,
                }),
            ]);

            expect(stack.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
            expect(stack.toJson()).to.equal(json('./json-templates/rds-template.json'));
        });
        it('should create a valid vpc stack', function() {
            const vpc = kosmoform.ec2.VPC('TheVpc', {
                CidrBlock: '192.168.0.0/16',
                EnableDnsSupport: true,
                EnableDnsHostnames: true,
                Tags: {
                    Application: kosmoform.refs.StackId,
                    Name: kosmoform.fn.join('-', [kosmoform.refs.StackName, 'TheVpc']),
                },
            });

            const internetGateway = kosmoform.ec2.InternetGateway('Igw', {
                Tags: {
                    Application: kosmoform.refs.StackId,
                    Name: kosmoform.fn.join('-', [kosmoform.refs.StackName, 'Igw']),
                    Network: 'public',
                },
            });

            const internetGatewayAttachment = kosmoform.ec2.VPCGatewayAttachment('GatewayAttachment', {
                VpcId: vpc,
                InternetGatewayId: internetGateway,
            });

            const subnet = kosmoform.ec2.Subnet('Subnet', {
                VpcId: vpc,
                AvailabilityZone: 'az',
                CidrBlock: '0.0.0.10/8',
            });

            const routeTable = kosmoform.ec2.RouteTable('RouteTable', {
                VpcId: vpc,
            });

            const route = kosmoform.ec2.Route('Route', {
                RouteTableId: routeTable,
                DestinationCidrBlock: '0.0.0.0/0',
                GatewayId: internetGateway,
            }, {
                DependsOn: internetGatewayAttachment.name,
            });

            const routeTableAssociation = kosmoform.ec2.SubnetRouteTableAssociation('SubnetRouteTableAssociation', {
                SubnetId: subnet,
                RouteTableId: routeTable,
            });

            const nacl = kosmoform.ec2.NetworkAcl('Nacl', {
                VpcId: vpc,
            });

            const networkAclEntry = kosmoform.ec2.NetworkAclEntry('InboundAllowAll', {
                NetworkAclId: nacl,
                RuleNumber: 1,
                Protocol: 'all',
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
            });

            const networkAclAssociation = kosmoform.ec2.SubnetNetworkAclAssociation('SubnetNaclAssociation', {
                SubnetId: subnet,
                NetworkAclId: nacl,
            });

            const stack = new kosmoform.Stack('stack-name', 'stack-description');

            stack.add([
                vpc,
                internetGateway,
                internetGatewayAttachment,
                subnet,
                routeTable,
                route,
                routeTableAssociation,
                nacl,
                networkAclEntry,
                networkAclAssociation,
            ]);

            expect(stack.validate()).to.deep.equal({
                errors: [],
                warnings: [],
            });
            expect(stack.toJson()).to.equal(json('./json-templates/vpc-template.json'));
        });
    });

});
