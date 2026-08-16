import { verifyAccessToken, hashToken } from '../utils/token.js';
import { User, Session } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.zylo_access_token) {
    token = req.cookies.zylo_access_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return next();
  }

  // Find active user
  const user = await User.findOne({ _id: decoded.sub, isActive: true, deletedAt: null }).lean();
  if (!user) {
    return next();
  }

  // Check session validity if sessionId is present
  if (decoded.sessionId) {
    const session = await Session.findOne({
      _id: decoded.sessionId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).lean();

    if (!session) {
      return next();
    }
    req.sessionId = session._id;
  }

  req.user = user;
  next();
});

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required to access this resource.'));
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.'));
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Access forbidden. Requires one of roles: ${roles.join(', ')}`));
  }
  next();
};

export const requireAdmin = requireRole('admin', 'staff');

export const verifyCsrf = (req, res, next) => {
  // Safe methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip webhook verification paths (they use provider signatures)
  if (req.path.includes('/webhook')) {
    return next();
  }

  const cookieToken = req.cookies['XSRF-TOKEN'] || req.cookies['xsrf-token'];
  const headerToken = req.headers['x-csrf-token'] || req.headers['xsrf-token'] || req.headers['x-xsrf-token'];

  // In non-production/API testing or if bearer token is used, allow with warning
  if (req.headers.authorization && !req.cookies.zylo_access_token) {
    return next();
  }

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token.'));
  }

  next();
};

export default { authenticate, requireAuth, requireRole, requireAdmin, verifyCsrf };
