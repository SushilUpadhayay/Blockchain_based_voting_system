const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getRequestElectionId = (req) => req.params?.electionId || req.body?.electionId || req.query?.electionId;

const isBlockedFromAllVoterRegistrations = (user) => {
  const registrations = user?.elections || [];
  return user?.role === 'user' && registrations.length > 0 && registrations.every((entry) => entry.status === 'blocked');
};

/**
 * JWT Authentication Middleware.
 * Decodes and verifies session JWTs, handles token expiration, validates real-time 
 * account status, and populates req.user.
 */
const protect = async (req, res, next) => {
  let token;
  // 1. Check for JWT inside Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      // Fail fast if server configuration is incorrect
      if (!secret) {
        res.status(500);
        return next(new Error('Server configuration error: JWT_SECRET is not configured.'));
      }
      // 2. Decode and verify the cryptographic signature (Strict: no fallback secret)
      const decoded = jwt.verify(token, secret);
      // 3. Load the user from the database to check current electoral status
      const dbUser = await User.findById(decoded.id);
      if (!dbUser) {
        res.status(401);
        return next(new Error('Authentication failed: User account not found.'));
      }
      // Real-time block check: Prevent blocked users from taking any API actions
      if (dbUser.status === 'blocked') {
        res.status(403);
        return next(new Error('Account blocked'));
      }
      if (isBlockedFromAllVoterRegistrations(dbUser)) {
        res.status(403);
        return next(new Error('This voter account is blocked'));
      }
      const electionId = getRequestElectionId(req);
      if (electionId) {
        const electionRegistration = dbUser.getElectionRegistration?.(electionId);
        if (electionRegistration?.status === 'blocked') {
          res.status(403);
          return next(new Error('This voter is blocked from this election'));
        }
      }
      // 4. Attach user data to request context for downstream controllers & role guards
      req.user = dbUser;
      // Also inject decoded token payload fields for stateless checks
      req.user.decodedRole = decoded.role;
      req.user.decodedWalletAddress = decoded.walletAddress;
      return next();
    } catch (error) {
      console.error('[AuthMiddleware] Verification failed:', error.message);
      res.status(401);
      // Specifically target TokenExpiredError to return a helpful user message
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Session expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Invalid session token. Please log in again.'));
      }
      return next(new Error('Not authorized: session verification failed.'));
    }
  }
  // 5. Fail if no token was provided
  if (!token) {
    res.status(401);
    return next(new Error('Not authorized: no token provided.'));
  }
};
module.exports = { protect };
