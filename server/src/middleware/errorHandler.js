import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Path '${req.originalUrl}' not found on this server`, 'NOT_FOUND'));
};

export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred.';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.keys(err.errors || {}).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  } else if (err.code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
    details = err.keyValue;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = `Invalid format for ${err.path}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log error server-side
  if (statusCode >= 500) {
    logger.error(
      {
        requestId,
        err: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl
      },
      'Internal Server Error'
    );
  } else {
    logger.warn(
      {
        requestId,
        statusCode,
        errorCode,
        message,
        url: req.originalUrl
      },
      'Client Error'
    );
  }

  const responseBody = {
    error: {
      code: errorCode,
      message,
      requestId,
      ...(details && { details }),
      ...(env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
    }
  };

  res.status(statusCode).json(responseBody);
};

export default { notFoundHandler, errorHandler };
