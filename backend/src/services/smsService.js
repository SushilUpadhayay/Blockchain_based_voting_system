const twilio = require("twilio");

// Lazy initialization or check for placeholders
const isTwilioConfigured = 
  process.env.TWILIO_SID && 
  process.env.TWILIO_SID.startsWith('AC') && 
  process.env.TWILIO_AUTH_TOKEN && 
  process.env.TWILIO_PHONE && 
  process.env.TWILIO_PHONE !== 'your_twilio_phone_number';

let client;
if (isTwilioConfigured) {
  client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

/**
 * Sends an OTP to a phone number using Twilio.
 * @param {string} phone - The recipient's phone number (E.164 format).
 * @param {string} otp - The 6-digit OTP code.
 */
const sendOTP = async (phone, otp) => {
  if (!isTwilioConfigured) {
    console.warn(`[SMS SERVICE] Twilio is not configured. MOCK OTP for ${phone}: ${otp}`);
    return { sid: 'MOCK_SID_' + Date.now() };
  }

  try {
    const message = await client.messages.create({
      body: `Your VoteChain OTP is ${otp}. It expires in 5 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });
    console.log(`[SMS SERVICE] OTP sent to ${phone}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`[SMS SERVICE] Error sending OTP to ${phone}:`, error.message);
    throw new Error('Failed to send SMS OTP. Please try again later.');
  }
};

module.exports = { sendOTP };
