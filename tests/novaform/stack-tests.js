var novaform = require('../../lib/novaform/');

function json(fileName) {
    const data = require(fileName);
    return JSON.stringify(data, null, 2);
}
describe('novaform.stack', function() {

    describe('#toJson()', function () {

        it('should create valid empty stack template', function() {
            const stack = new novaform.Stack('stack-name', 'stack-description');

            expect(stack.toJson()).to.equal(json('./json-templates/empty-template.json'));
        });

        it('should create valid template with s3 bucket', function() {
            const bucket = novaform.s3.Bucket('Bucket', {
                BucketName: 'bucket-name',
                AccessControl: 'Private',
            });

            const stack = new novaform.Stack('stack-name', 'stack-description');
            stack.add(bucket);

            expect(stack.toJson()).to.equal(json('./json-templates/s3-bucket-template.json'));
        });

        it('should create valid rds stack', function() {
            const securityGroup = novaform.ec2.SecurityGroup('SecurityGroup', {
                VpcId: 'vpc-id',
                GroupDescription: 'description',
            });

            const sgi = novaform.ec2.SecurityGroupIngress('DbSgi', {
                GroupId: securityGroup,
                IpProtocol: 'tcp',
                FromPort: 5432,
                ToPort: 5432,
                CidrIp: '0.0.0.0/0',
            });

            const subnetGroup = novaform.rds.DBSubnetGroup('DbSubnetGroup', {
                DBSubnetGroupDescription: 'description',
                SubnetIds: ['public-subnets'],
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.fn.join('-', [novaform.refs.StackName, 'DbSubnetGroup']),
                },
            });

            const dbinstance = novaform.rds.DBInstance('DbInstance', {
                AllocatedStorage: 10,
                DBInstanceClass: 'instance-type',
                DBSubnetGroupName: subnetGroup,
                Engine: 'postgres',
                EngineVersion: '9.3.5',
                MasterUsername: 'username',
                MasterUserPassword: novaform.fn.ref('DatabasePassword'),
                BackupRetentionPeriod: 7,
                PubliclyAccessible: true,
                VPCSecurityGroups: [securityGroup],
                MultiAZ: false,
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.fn.join('-', [novaform.refs.StackName, 'DbInstance']),
                },
            });

            const r53record = novaform.r53.RecordSet('DbR53', {
                HostedZoneId: 'external-hosted-zone-id',
                Type: 'CNAME',
                Name: 'db.external-zone',
                TTL: '60',
                ResourceRecords: [
                    novaform.fn.getAtt(dbinstance, 'Endpoint.Address'),
                ],
            });

            const stack = new novaform.Stack('stack-name', 'stack-description');

            stack.add([
                securityGroup,
                sgi,
                subnetGroup,
                dbinstance,
                r53record,
            ]);
            stack.add([
                novaform.Output('id', dbinstance),
                novaform.Output('dbaddress', novaform.fn.getAtt(dbinstance, 'Endpoint.Address')),
                novaform.Output('dbport', novaform.fn.getAtt(dbinstance, 'Endpoint.Port')),
                novaform.Output('hostname', r53record),
            ]);
            stack.add([
                novaform.Parameter('DatabasePassword', {
                    Type: 'String',
                    NoEcho: true,
                }),
            ]);

            expect(stack.toJson()).to.equal(json('./json-templates/rds-template.json'));
        });

        it('should create a valid vpc stack', function() {
            const vpc = novaform.ec2.VPC('TheVpc', {
                CidrBlock: '192.168.0.0/16',
                EnableDnsSupport: true,
                EnableDnsHostnames: true,
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.fn.join('-', [novaform.refs.StackName, 'TheVpc']),
                },
            });

            const internetGateway = novaform.ec2.InternetGateway('Igw', {
                Tags: {
                    Application: novaform.refs.StackId,
                    Name: novaform.fn.join('-', [novaform.refs.StackName, 'Igw']),
                    Network: 'public',
                },
            });

            const internetGatewayAttachment = novaform.ec2.VPCGatewayAttachment('GatewayAttachment', {
                VpcId: vpc,
                InternetGatewayId: internetGateway,
            });

            const subnet = novaform.ec2.Subnet('Subnet', {
                VpcId: vpc,
                AvailabilityZone: 'az',
                CidrBlock: '0.0.0.10/8',
            });

            const routeTable = novaform.ec2.RouteTable('RouteTable', {
                VpcId: vpc,
            });

            const route = novaform.ec2.Route('Route', {
                RouteTableId: routeTable,
                DestinationCidrBlock: '0.0.0.0/0',
                GatewayId: internetGateway,
            }, {
                DependsOn: internetGatewayAttachment.name,
            });

            const routeTableAssociation = novaform.ec2.SubnetRouteTableAssociation('SubnetRouteTableAssociation', {
                SubnetId: subnet,
                RouteTableId: routeTable,
            });

            const nacl = novaform.ec2.NetworkAcl('Nacl', {
                VpcId: vpc,
            });

            const networkAclEntry = novaform.ec2.NetworkAclEntry('InboundAllowAll', {
                NetworkAclId: nacl,
                RuleNumber: 1,
                Protocol: 'all',
                RuleAction: 'allow',
                Egress: false,
                CidrBlock: '0.0.0.0/0',
            });

            const networkAclAssociation = novaform.ec2.SubnetNetworkAclAssociation('SubnetNaclAssociation', {
                SubnetId: subnet,
                NetworkAclId: nacl,
            });

            const stack = new novaform.Stack('stack-name', 'stack-description');

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

            expect(stack.toJson()).to.equal(json('./json-templates/vpc-template.json'));

        });

    });

});
