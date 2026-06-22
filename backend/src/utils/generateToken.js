const jwt = require('jsonwebtoken');

/**
 * Generates a cryptographically secure, short-lived JWT session token.
 * Contains user ID, role, and wallet address directly in the payload
 * to allow stateless middleware validation.
 *
 * @param {string} id - User's MongoDB unique identifier.
 * @param {string} role - User's role ('user' or 'admin').
 * @param {string} walletAddress - User's bound Ethereum wallet address.
 * @returns {string} - Signed JWT token string.
 */
const generateToken = (id, role, walletAddress) => {
  const secret = process.env.JWT_SECRET;
  
  // Mandatory check: Fail fast if JWT_SECRET is missing to prevent weak keys in production
  if (!secret) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing!');
    throw new Error('Server configuration error: JWT_SECRET must be defined.');
  }

  // Include role and walletAddress inside JWT payload for role-based gating
  return jwt.sign(
    { 
      id, 
      role, 
      walletAddress: walletAddress ? walletAddress.toLowerCase() : null 
    }, 
    secret, 
    {
      expiresIn: '2h', // lifespan of 2 hours to limit token hijacking risk
    }
  );
};

module.exports = generateToken;
