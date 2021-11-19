class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Forwards rejected promises from async route handlers to Express's error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Parses a route param as a positive integer id, or responds 404
function toId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(404, 'Resource not found');
  }
  return id;
}

module.exports = { HttpError, asyncHandler, toId };
