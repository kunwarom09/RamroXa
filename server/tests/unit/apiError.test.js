import { describe, it, expect } from 'vitest';
import { ApiError } from '../../src/utils/ApiError.js';

describe('ApiError utility class', () => {
  it('should instantiate with correct status code, message and code', () => {
    const err = new ApiError(400, 'Custom error', 'CUSTOM_CODE', { field: 'name' });
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Custom error');
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.details).toEqual({ field: 'name' });
    expect(err.isOperational).toBe(true);
  });

  it('should generate standard factory errors', () => {
    const badReq = ApiError.badRequest('Invalid input');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe('BAD_REQUEST');

    const unauth = ApiError.unauthorized('No token');
    expect(unauth.statusCode).toBe(401);
    expect(unauth.code).toBe('UNAUTHORIZED');

    const forb = ApiError.forbidden('Forbidden action');
    expect(forb.statusCode).toBe(403);
    expect(forb.code).toBe('FORBIDDEN');

    const notFound = ApiError.notFound('Product not found');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');

    const conflict = ApiError.conflict('Stock unavailable');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.code).toBe('CONFLICT');

    const rate = ApiError.tooManyRequests('Slow down');
    expect(rate.statusCode).toBe(429);
    expect(rate.code).toBe('TOO_MANY_REQUESTS');

    const internal = ApiError.internal('Database crash');
    expect(internal.statusCode).toBe(500);
    expect(internal.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
