var path = require('path');

module.exports = function(nova) {

    var artifact = {
        name: 'lambda',

        region: 'eu-west-1',

        build: function() {
            var applicationPath = path.join(__dirname, 'src');
            return nova.lib.createLambdaArtifact('notify-me-lambda-nova', applicationPath);
        },
    };

    var lambdaComopnent = {
        name: 'lambda',

        region: 'eu-west-1',

        dependencies: {
            artifacts: ['lambda'],
            components: ['hello-world/bucket'],
        },

        build: function(deps) {

            var artifact = deps.getArtifact('lambda');
            var bucketName = deps.getComponent('hello-world/bucket');

            var role = nova.form.iam.Role('ExecRole', {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: [ 'lambda.amazonaws.com' ],
                            },
                            Action: [ 'sts:AssumeRole' ],
                        },
                    ],
                },
                Path: '/',
                Policies: [
                    {
                        PolicyName: 'root',
                        PolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Action: [ 'logs:CreateLogGroup','logs:CreateLogStream','logs:PutLogEvents' ],
                                    Resource: 'arn:aws:logs:*:*:*',
                                },
                                {
                                    Effect: 'Allow',
                                    Action: [ 's3:PutObject' ],
                                    Resource: 'arn:aws:s3:::' + bucketName + '/notify-me-sample/*',
                                },
                            ],
                        },
                    },
                ],
            });

            var lambda = nova.form.lambda.Function('EventsLambda', {
                Code: {
                    S3Bucket: artifact.bucket,
                    S3Key: artifact.key,
                },
                Handler: 'kowabunga.handler',
                Runtime: 'nodejs',
                Role: nova.form.fn.getAtt(role, 'Arn'),
            });

            return {
                resources: [
                    role,
                    lambda,
                ],

                outputs: [
                    nova.form.Output('arn', nova.form.fn.getAtt(lambda, 'Arn')),
                ],
            };
        },
    };

    var snsComponent = {
        name: 'sns',

        region: 'eu-west-1',

        dependencies: {
            components: ['lambda'],
        },

        build: function(deps) {
            var lambdaArn = deps.getComponent('lambda').arn;

            var topic = nova.form.sns.Topic('EventsTopic', {
                Subscription: [
                    {
                        Endpoint: lambdaArn,
                        Protocol: 'lambda',
                    },
                ],
            });

            return {
                resources: [
                    topic,
                ],
                outputs: [
                    nova.form.Output('arn', topic),
                ]
            };
        },
    };

    var stackToMonitorComponent = {
        name: 'stack',

        region: 'eu-west-1',

        dependencies: {
            components: ['sns'],
        },

        notificationArns: function(deps) {
            return deps.getComponent('sns').arn;
        },

        build: function(deps) {
            var bucket = nova.form.s3.Bucket('Bucket', {
                BucketName: 'nova-notify-me-bucket-' + nova.lib.getAwsAccountId(),
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

        }
    };

    return {
        project: 'notify-me',
        components: [
            lambdaComopnent,
            snsComponent,
            stackToMonitorComponent,
        ],
        artifacts: [
            artifact,
        ],
    };
}
