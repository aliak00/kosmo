var path = require('path');

module.exports = function(nova) {

    var helloWorldArtifact = {
        name: 'hello-world',
        region: ['eu-west-1', 'eu-central-1'],
        build: function(options, done) {
            var applicationPath = path.join(__dirname, 'src');
            return nova.lib.createEbArtifact('hello-world-nova', applicationPath);
        },
    };

    var helloWorldBucket = {
        name: 'bucket',
        region: 'eu-west-1',
        build: function(deps) {
            var bucket = nova.form.s3.Bucket('Bucket', {
                BucketName: 'nova-hello-world-bucket-' + nova.lib.getAwsAccountId(),
                AccessControl: 'Private',
                VersioningConfiguration: {
                    Status: 'Enabled',
                },
            });

            return {
                resources: [
                    bucket,
                ],
                outputs: [
                    nova.form.Output('name', bucket.properties.BucketName),
                    nova.form.Output('domainName', nova.form.fn.getAtt(bucket, 'DomainName')),
                ],
            };
        },
    };

    var helloWorldApp = {
        name: 'app',
        region: 'eu-west-1',
        dependencies: ['bucket'],
        build: function(deps) {
            return nova.lib.findArtifact(this.region, helloWorldArtifact.name).then(artifact => {

                var role = nova.form.iam.Role('IAmRole', {
                    AssumeRolePolicyDocument: {
                        Statement: [
                            {
                                Effect: 'Allow',
                                Principal: {
                                    Service: [ 'ec2.amazonaws.com' ],
                                },
                                Action: [ 'sts:AssumeRole' ],
                            },
                        ]
                    },
                    Path: '/',
                });

                var policy = nova.form.iam.Policy('IAmRolePolicy', {
                    PolicyName: role.name,
                    Roles: [ role ],
                    PolicyDocument: {
                        Statement: [
                            {
                                Effect: 'Allow',
                                NotAction: [ 'iam:*' ],
                                Resource: '*',
                            },
                        ],
                    },
                });

                var instanceProfile = nova.form.iam.InstanceProfile('IAmInstanceProfile', {
                    Path: '/',
                    Roles: [ role ],
                });

                var app = nova.stl.EBApp({
                    name: 'App',
                    artifact: artifact,
                    stackName: '64bit Amazon Linux 2015.09 v2.0.6 running Node.js',
                    optionSettings: nova.stl.EBOptionSettings({
                        'aws:autoscaling:launchconfiguration': {
                            EC2KeyName: nova.params.keyName,
                            IamInstanceProfile: instanceProfile,
                        },
                        'aws:elasticbeanstalk:container:nodejs': {
                            NodeCommand: 'node server.js',
                        },
                        'aws:elasticbeanstalk:application:environment': {
                            BUCKET_NAME: deps.bucket.name,
                            BUCKET_DOMAIN: deps.bucket.domainName,
                            PORT: '8080',
                        },
                    }),
                });

                return {
                    resources: [
                        role,
                        policy,
                        instanceProfile,
                        app,
                    ],

                    outputs: [
                        nova.form.Output('apiApplication', app.app),
                        nova.form.Output('apiApplicationVersion', app.version),
                        nova.form.Output('apiEnvironment', app.environment),
                        nova.form.Output('url', nova.form.fn.join('', ['http://', nova.form.fn.getAtt(app.environment, 'EndpointURL')])),
                    ],
                };

            });
        },
    };

    return {
        project: 'hello-world',
        components: [
            helloWorldBucket,
            helloWorldApp,
        ],
        artifacts: [
            helloWorldArtifact,
        ],
    };
}
