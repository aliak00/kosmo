var path = require('path');

module.exports = function(kosmo) {

    var helloWorldServer = {
        name: 'server',

        region: ['eu-west-1', 'eu-central-1'],

        build: function() {
            var applicationPath = path.join(__dirname, 'src');
            return kosmo.lib.createEbArtifact('hello-world-kosmo', applicationPath);
        },
    };

    var helloWorldBucket = {
        name: 'bucket',

        region: 'eu-west-1',

        build: function() {
            var bucket = kosmo.form.s3.Bucket('Bucket', {
                BucketName: 'kosmo-hello-world-bucket-' + kosmo.lib.getAwsAccountId(),
                AccessControl: 'Private',
            });

            return {
                resources: [
                    bucket,
                ],
                outputs: [
                    kosmo.form.Output('name', bucket.properties.BucketName),
                    kosmo.form.Output('domainName', kosmo.form.fn.getAtt(bucket, 'DomainName')),
                ],
            };
        },
    };

    var helloWorldApp = {
        name: 'app',

        region: 'eu-west-1',

        dependencies: {
            components: ['bucket'],
        },

        build: function(context) {
            var bucket = context.getComponent('bucket');
            var bucketName = bucket.name;
            var bucketDomainName = bucket.domainName;

            return kosmo.lib.findArtifact(this.region, helloWorldServer.name).then(artifact => {

                var role = kosmo.form.iam.Role('IAmRole', {
                    AssumeRolePolicyDocument: {
                        Statement: [
                            {
                                Effect: 'Allow',
                                Principal: {
                                    Service: [ 'ec2.amazonaws.com' ],
                                },
                                Action: [ 'sts:AssumeRole' ],
                            },
                        ],
                    },
                    Path: '/',
                });

                var policy = kosmo.form.iam.Policy('IAmRolePolicy', {
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

                var instanceProfile = kosmo.form.iam.InstanceProfile('IAmInstanceProfile', {
                    Path: '/',
                    Roles: [ role ],
                });

                var app = kosmo.stl.EBApp({
                    name: 'App',
                    artifact: artifact,
                    stackName: '64bit Amazon Linux 2015.09 v2.0.6 running Node.js',
                    optionSettings: kosmo.stl.EBOptionSettings({
                        'aws:autoscaling:launchconfiguration': {
                            EC2KeyName: kosmo.params.keyName,
                            IamInstanceProfile: instanceProfile,
                        },
                        'aws:elasticbeanstalk:container:nodejs': {
                            NodeCommand: 'node server.js',
                        },
                        'aws:elasticbeanstalk:application:environment': {
                            BUCKET_NAME: bucketName,
                            BUCKET_DOMAIN: bucketDomainName,
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
                        kosmo.form.Output('apiApplication', app.app),
                        kosmo.form.Output('apiApplicationVersion', app.version),
                        kosmo.form.Output('apiEnvironment', app.environment),
                        kosmo.form.Output('url', kosmo.form.fn.join('', ['http://', kosmo.form.fn.getAtt(app.environment, 'EndpointURL')])),
                    ],
                };

            });
        },
    };

    return {
        kosmoVersion: '>0.0.1',
        project: 'hello-world',
        components: [
            helloWorldBucket,
            helloWorldApp,
        ],
        artifacts: [
            helloWorldServer,
        ],
    };

};
