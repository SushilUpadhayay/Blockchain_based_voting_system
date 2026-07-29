const OtpLimit = require('../models/OtpLimit');

/**
 * Checks if a user is allowed to request an OTP and updates rate-limit records.
 *
 * Rules:
 * 1. Free requests: Requests #1 and #2 are always allowed with no cooldown.
 * 2. 60-second Cooldown (Rule 7): After every successful OTP request from #3 onwards,
 *    a 60-second cooldown is enforced before the next request is permitted.
 *    This applies to requests #3, #4, and #5.
 * 3. 30-minute Lockout (Rule 9): If a user has already made 5 successful requests in the
 *    rolling 15-minute window and attempts a 6th, the request is rejected and the user
 *    is locked out for 30 minutes.
 *
 * Request flow:
 *   #1 → allowed, no cooldown
 *   #2 → allowed, no cooldown
 *   #3 → allowed, 60s cooldown starts
 *   #4 → allowed after 60s, 60s cooldown starts
 *   #5 → allowed after 60s, 60s cooldown starts
 *   #6 → REJECTED, 30-minute lockout triggered
 *
 * @param {string} email - User's email.
 * @param {string} purpose - 'login', 'superadmin_registration',
 *   'registration_<electionId>', 'verifier_registration_<electionId>', or 'voting_<electionId>'.
 * @returns {Promise<{ allowed: boolean, remainingSeconds?: number, errorType?: 'lockout' | 'cooldown', nextCooldownSeconds?: number }>}
 */
const checkAndRecordOtpRequest = async (email, purpose) => {
  const emailLower = email.toLowerCase();

  // 1. Find or create the limit document
  let limitDoc = await OtpLimit.findOne({ email: emailLower, purpose });
  if (!limitDoc) {
    limitDoc = new OtpLimit({ email: emailLower, purpose, requestTimestamps: [] });
  }

  // 2. Active Lockout Check
  if (limitDoc.lockoutUntil && limitDoc.lockoutUntil > new Date()) {
    const remainingSeconds = Math.ceil((limitDoc.lockoutUntil.getTime() - Date.now()) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      errorType: 'lockout'
    };
  }

  // Clear an expired lockout and reset the window
  if (limitDoc.lockoutUntil && limitDoc.lockoutUntil <= new Date()) {
    limitDoc.lockoutUntil = null;
    limitDoc.requestTimestamps = [];
  }

  // 3. Clean up timestamps older than 15 minutes (rolling window)
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  limitDoc.requestTimestamps = limitDoc.requestTimestamps.filter(t => t.getTime() > fifteenMinsAgo);

  const requestCount = limitDoc.requestTimestamps.length;

  // 4. Rolling Limit Check — max 5 successful requests per 15-minute window.
  //    If there are already 5 recorded timestamps, this is the 6th attempt → lock out (Rule 9).
  if (requestCount >= 5) {
    limitDoc.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    await limitDoc.save();
    return {
      allowed: false,
      remainingSeconds: 30 * 60,
      errorType: 'lockout'
    };
  }

  // 5. 60-Second Cooldown Check (Rule 7) — applies from the 3rd request onwards.
  //    After requests #3, #4, and #5 are recorded, the next attempt must wait 60 seconds.
  if (requestCount >= 3) {
    const lastRequestTime = limitDoc.requestTimestamps[limitDoc.requestTimestamps.length - 1];
    const elapsedSeconds = Math.floor((Date.now() - lastRequestTime.getTime()) / 1000);

    if (elapsedSeconds >= 0 && elapsedSeconds < 60) {
      return {
        allowed: false,
        remainingSeconds: 60 - elapsedSeconds,
        errorType: 'cooldown'
      };
    }
  }

  // 6. Request is allowed — record the timestamp
  limitDoc.requestTimestamps.push(new Date());
  await limitDoc.save();

  // Determine the cooldown the frontend should display after this request.
  // Rule 7: every successful request from #3 onwards starts a 60s cooldown.
  // After request #5 the 60s countdown still applies; the NEXT attempt after that
  // will trigger a 30-minute lockout (Rule 9) rather than another OTP.
  const newCount = limitDoc.requestTimestamps.length;
  const nextCooldownSeconds = newCount >= 3 ? 60 : 0;

  return {
    allowed: true,
    nextCooldownSeconds
  };
};

module.exports = {
  checkAndRecordOtpRequest
};
