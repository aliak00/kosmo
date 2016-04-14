var path = require('path');

module.exports = function(kosmo) {

    var artifact = {
        name: 'lambda',

        region: 'eu-west-1',

        build: function() {
            var applicationPath = path.join(__dirname, 'src');
            return kosmo.lib.createLambdaArtifact('notify-me-lambda-kosmo', applicationPath);
        },
    };

    var lambdaComopnent = {
        name: 'lambda',

        region: 'eu-west-1',

        dependencies: {
            artifacts: ['lambda'],
            components: ['hello-world/bucket'],
        },

        build: function(context) {

            var artifact = context.getArtifact('lambda');
            var bucketName = context.getComponent('hello-world/bucket');

            var role = kosmo.form.iam.Role('ExecRole', {
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

            var lambda = kosmo.form.lambda.Function('EventsLambda', {
                Code: {
                    S3Bucket: artifact.bucket,
                    S3Key: artifact.key,
                },
                Handler: 'kowabunga.handler',
                Runtime: 'nodejs',
                Role: kosmo.form.fn.getAtt(role, 'Arn'),
            });

            return {
                resources: [
                    role,
                    lambda,
                ],

                outputs: [
                    kosmo.form.Output('arn', kosmo.form.fn.getAtt(lambda, 'Arn')),
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

        build: function(context) {
            var lambdaArn = context.getComponent('lambda').arn;

            var topic = kosmo.form.sns.Topic('EventsTopic', {
                Subscription: [
                    {
                        Endpoint: lambdaArn,
                        Protocol: 'lambda',
                    },
                ],
            });

            var lambdaPermission = kosmo.form.lambda.Permission('SnsPermission', {
                Action: 'lambda:*',
                FunctionName: lambdaArn,
                Principal: 'sns.amazonaws.com',
                SourceArn: topic,
            });

            return {
                resources: [
                    topic,
                    lambdaPermission,
                ],
                outputs: [
                    kosmo.form.Output('arn', topic),
                ],
            };
        },
    };

    var stackToMonitorComponent = {
        name: 'stack',

        region: 'eu-west-1',

        dependencies: {
            components: ['sns'],
        },

        notificationArns: function(context) {
            return context.getComponent('sns').arn;
        },

        build: function() {
            var bucket = kosmo.form.s3.Bucket('Bucket', {
                BucketName: 'kosmo-notify-me-bucket-' + kosmo.lib.getAwsAccountId(),
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

    return {
        kosmoVersion: '>0.0.1',
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
};
