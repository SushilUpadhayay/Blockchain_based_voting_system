const OtpLimit = require('../models/OtpLimit');

/**
 * Checks if a user is allowed to request an OTP and updates rate-limit records.
 * 
 * Rules:
 * 1. 30-minute Lockout: If user has made >= 5 requests in a rolling 15-minute window, they are locked out for 30 minutes.
 * 2. 60-second Cooldown: Triggered after the 3rd request (i.e. if request count >= 3).
 * 
 * @param {string} email - User's email.
 * @param {string} purpose - 'registration', 'login', or 'voting'.
 * @returns {Promise<{ allowed: boolean, remainingSeconds?: number, errorType?: 'lockout' | 'cooldown', nextCooldownSeconds?: number }>}
 */
const checkAndRecordOtpRequest = async (email, purpose) => {
  const emailLower = email.toLowerCase();
  
  // 1. Find or create the limit document
  let limitDoc = await OtpLimit.findOne({ email: emailLower, purpose });
  if (!limitDoc) {
    limitDoc = new OtpLimit({ email: emailLower, purpose, requestTimestamps: [] });
  }

  // 2. Lockout Check
  if (limitDoc.lockoutUntil && limitDoc.lockoutUntil > new Date()) {
    const remainingSeconds = Math.ceil((limitDoc.lockoutUntil.getTime() - Date.now()) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      errorType: 'lockout'
    };
  }

  // Clear expired lockout
  if (limitDoc.lockoutUntil && limitDoc.lockoutUntil <= new Date()) {
    limitDoc.lockoutUntil = null;
    limitDoc.requestTimestamps = []; // reset timestamps after lockout expires
  }

  // 3. Clean up timestamps older than 15 minutes (rolling window)
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  limitDoc.requestTimestamps = limitDoc.requestTimestamps.filter(t => t.getTime() > fifteenMinsAgo);

  const requestCount = limitDoc.requestTimestamps.length;

  // 4. Rolling Limit Check (max 5 requests per 15 mins)
  // If count is already 5, they are attempting the 6th request, trigger 30-minute lockout immediately
  if (requestCount >= 5) {
    limitDoc.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    await limitDoc.save();
    return {
      allowed: false,
      remainingSeconds: 30 * 60,
      errorType: 'lockout'
    };
  }

  // 5. Cooldown Check (starts after the 3rd request)
  // Count is 3 or 4, meaning T3 or T4 has been recorded, we need a 60-second cooldown from the last request
  if (requestCount >= 3) {
    const lastRequestTime = limitDoc.requestTimestamps[limitDoc.requestTimestamps.length - 1];
    const elapsedTime = Math.floor((Date.now() - lastRequestTime.getTime()) / 1000);

    if (elapsedTime >= 0 && elapsedTime < 60) {
      const remainingSeconds = 60 - elapsedTime;
      return {
        allowed: false,
        remainingSeconds,
        errorType: 'cooldown'
      };
    }
  }

  // 6. Request is allowed, record it!
  limitDoc.requestTimestamps.push(new Date());
  await limitDoc.save();

  // Determine next cooldown returned to frontend
  let nextCooldownSeconds = 0;
  const newCount = limitDoc.requestTimestamps.length;
  if (newCount === 3 || newCount === 4) {
    // 3rd or 4th request made, next request will face a 60s cooldown
    nextCooldownSeconds = 60;
  } else if (newCount === 5) {
    // 5th request made, next request is blocked for 15 minutes rolling window
    // The cooldown is when the oldest request falls out of the 15-minute window
    const oldestRequestTime = limitDoc.requestTimestamps[0];
    const remainingTime = Math.ceil((oldestRequestTime.getTime() + 15 * 60 * 1000 - Date.now()) / 1000);
    nextCooldownSeconds = Math.max(0, remainingTime);
  }

  return {
    allowed: true,
    nextCooldownSeconds
  };
};

module.exports = {
  checkAndRecordOtpRequest
};
