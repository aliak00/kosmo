'use strict';

class NovaError extends Error {
  constructor(message) {
      super(message);
      Error.captureStackTrace(this, this.constructor.name);
  }
}

module.exports = NovaError;
