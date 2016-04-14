class KosmoError extends Error {
    constructor(message) {
        super(message);
        Error.captureStackTrace(this, this.constructor.name);
    }
}

module.exports = KosmoError;
