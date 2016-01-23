var _ = require('lodash')
    utils = require('./utils');

var Status = {
    DOES_NOT_EXIST: '__DOES_NOT_EXIST',

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

function Stack(stackName) {
    this.name = stackName;
}

Stack.Status = Status;

Stack.getStackInfo = function(cfn, stackName, callback) {
    cfn.describeStacks({
        StackName: stackName
    }, function(err, data) {
        if (err) {
            if (err.code === 'ValidationError' && err.message.indexOf('does not exist') !== -1) {
                callback(Status.DOES_NOT_EXIST);
                return;
            }
            callback(err);
            return;
        }
        var stack = data.Stacks[0];

        var result = new Stack(stackName);
        result.status = stack.StackStatus;
        result.outputs = utils.zipObject(_.map(stack.Outputs, function(e) {
            return [ e.OutputKey, e.OutputValue ];
        }));
        callback(null, result);
    });
};

Stack.getStackOutput = function(cfn, stackName, callback) {
    this.getStackInfo(cfn, stackName, function(err, stack) {
        callback(err, stack ? stack.outputs : undefined);
    });
};

Stack.getStackStatus = function(cfn, stackName, callback) {
    this.getStackInfo(cfn, stackName, function(err, stack) {
        if (err === Status.DOES_NOT_EXIST) {
            return callback(null, Status.DOES_NOT_EXIST);
        }
        callback(err, stack ? stack.status : undefined);
    });
};

Stack.isStatusPending = function(status) {
    return status === Status.CREATE_IN_PROGRESS ||
        status === Status.DELETE_IN_PROGRESS ||
        status === Status.ROLLBACK_IN_PROGRESS ||
        status === Status.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS ||
        status === Status.UPDATE_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_IN_PROGRESS;
};

Stack.isStatusComplete = function(status) {
    return status === Status.CREATE_COMPLETE ||
        status === Status.DELETE_COMPLETE ||
        status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

Stack.isStatusValidCompleteState = function(status) {
    return status === Status.CREATE_COMPLETE ||
        status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

Stack.isStatusFailed = function(status) {
    return status === Status.CREATE_FAILED ||
        status === Status.DELETE_FAILED ||
        status === Status.ROLLBACK_FAILED ||
        status === Status.UPDATE_ROLLBACK_FAILED;
};

Stack.isStatusRolledBack = function(status) {
    return status === Status.ROLLBACK_COMPLETE ||
        status === Status.UPDATE_ROLLBACK_COMPLETE;
};

Stack.isStatusRollingback = function(status) {
    return status === Status.ROLLBACK_IN_PROGRESS ||
        status === Status.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS;
};

module.exports = Stack;
