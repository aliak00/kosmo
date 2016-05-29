module.exports = {
    // TODO: programatically load these. And add in the namespace the objects belong to so that
    // validation/error checking can be more clear
    asg: require('./asg'),
    cloudwatch: require('./cloudwatch'),
    eb: require('./elastic-beanstalk'), // TODO: rename to variable name
    ec2: require('./ec2'),
    ec: require('./ec'),
    ecs: require('./ecs'),
    elb: require('./elb'),
    iam: require('./iam'),
    lambda: require('./lambda'),
    r53: require('./route53'), // TODO: rename to variable name
    redshift: require('./redshift'),
    rds: require('./rds'),
    s3: require('./s3'),
    sqs: require('./sqs'),
    sns: require('./sns'),
};
