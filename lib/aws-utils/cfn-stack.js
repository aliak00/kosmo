var _ = require('lodash')
    , utils = require('../utils');

var Status = {
    DOES_NOT_EXIST: 'DOES_NOT_EXIST',

    CREATE_COMPLETE: 'CREATE_COMPLETE',
    CREATE_IN_PROGRESS: 'CREATE_IN_PROGRESS',
    CREATE_FAILED: 'CREATE_FAILED',
    DELETE_COMPLETE: 'DELETE_COMPLETE',
    DELETE_FAILED: 'DELETE_FAILED',
    DELETE_IN_PROGRESS: 'DELETE_IN_PROGRESS',
    ROLLBACK_COMPLETE: 'ROLLBACK_COMPLETE',
    ROLLBACK_FAILED: 'ROLLBACK_FAILED',
    ROLLBACK_IN_PROGRESS: 'ROLLBACK_IN_PROGRESS',
    UPDATE_COMPLETE: 'UPDATE_COMPLETE',
    UPDATE_COMPLETE_CLEANUP_IN_PROGRESS: 'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
    UPDATE_IN_PROGRESS: 'UPDATE_IN_PROGRESS',
    UPDATE_ROLLBACK_COMPLETE: 'UPDATE_ROLLBACK_COMPLETE',
    UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS: 'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
    UPDATE_ROLLBACK_FAILED: 'UPDATE_ROLLBACK_FAILED',
    UPDATE_ROLLBACK_IN_PROGRESS: 'UPDATE_ROLLBACK_IN_PROGRESS',
};

function CfnStack(name, status, outputs) {
    if (!(this instanceof CfnStack)) {
        return new CfnStack(name, status, outputs);
    }

    this.name = name;
    this.status = status;
    this.outputs = outputs;
}

CfnStack.Status = Status;

CfnStack.getStackInfo = function(cfn, stackName) {
    var describeStacks = utils.pbind(cfn.describeStacks, cfn, {
        StackName: stackName,
    });

    return describeStacks().then(data => {
        var stack = data.Stacks[0];

        var outputs = utils.zipObject(_.map(stack.Outputs, function(e) {
            return [e.OutputKey, e.OutputValue];
        }));

        return new CfnStack(stackName, stack.StackStatus, outputs);
    }, err => {
        if (err.code === 'ValidationError' && err.message.indexOf('does not exist') !== -1) {
            return Promise.reject(Status.DOES_NOT_EXIST);
        }
        return Promise.reject(err);
    });
};

CfnStack.getStackStatus = function(cfn, stackName) {
    return CfnStack.getStackInfo(cfn, stackName).then(stack => {
        return stack.status;
    }, err => {
        if (err === Status.DOES_NOT_EXIST) {
            return Status.DOES_NOT_EXIST;
        }
        return Promise.reject(err);
    });
};

CfnStack.isStatusPending = function(status) {
    return status === Status.CREATE_IN_PROGRESS ||
        status === Status.DELETE_IN_PROGRESS ||
        status === Status.ROLLBACK_IN_PROGRESS ||
        status === Status.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS ||
        status === Status.UPDATE_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_IN_PROGRESS;
};

CfnStack.isStatusComplete = function(status) {
    return status === Status.CREATE_COMPLETE ||
        status === Status.DELETE_COMPLETE ||
        status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

CfnStack.isStatusValidCompleteState = function(status) {
    return status === Status.CREATE_COMPLETE ||
        status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

CfnStack.isStatusFailed = function(status) {
    return status === Status.CREATE_FAILED ||
        status === Status.DELETE_FAILED ||
        status === Status.ROLLBACK_FAILED ||
        status === Status.UPDATE_ROLLBACK_FAILED;
};

CfnStack.isStatusRolledBack = function(status) {
    return status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

CfnStack.isStatusRollingback = function(status) {
    return status === Status.ROLLBACK_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS;
};

module.exports = CfnStack;
