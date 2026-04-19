/**
 * Mock OTP Service
 */
const crypto = require('crypto');

const generateOTP = () => {
  // Generate a random 6 digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (user, otp) => {
  return new Promise((resolve) => {
    // Simulate sending an SMS or email
    setTimeout(() => {
      console.log(`[OTP SERVICE] Sent OTP ${otp} to user ${user.name} (${user.email || user.phone})`);
      resolve(true);
    }, 500);
  });
};

module.exports = {
  generateOTP,
  sendOTP,
};
