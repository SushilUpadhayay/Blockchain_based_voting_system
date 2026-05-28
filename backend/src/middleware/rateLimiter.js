const rateLimit = require('express-rate-limit');

/**
 * Custom handler to return standardized error messages and exact wait durations.
 */
const rateLimitHandler = (message) => {
  return (req, res, next, options) => {
    const retryAfter = req.rateLimit 
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) 
      : Math.ceil(options.windowMs / 1000);

    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      message: `${message} Please try again in ${retryAfter} seconds.`,
      retryAfterSeconds: retryAfter
    });
  };
};

/**
 * Authentication and OTP request rate limiter.
 * Protects: login, OTP requests, and registration endpoints.
 * Limit: 5 requests per 5 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts.')
});

/**
 * Wallet Nonce endpoint rate limiter.
 * Protects: GET /api/auth/nonce
 * Limit: 10 requests per 5 minutes per IP.
 */
const nonceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many signature challenge requests.')
});

module.exports = {
  authLimiter,
  nonceLimiter
};
