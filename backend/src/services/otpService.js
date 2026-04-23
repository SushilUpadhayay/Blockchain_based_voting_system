const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via email
 * @param {Object} user - User object containing email and name
 * @param {string} otp - The OTP to send
 * @param {string} purpose - Purpose of the OTP (login, voting, etc.)
 */
const sendOTP = async (user, otp, purpose = 'login') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Your ${purpose.toUpperCase()} OTP for Blockchain Voting System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4CAF50; text-align: center;">Secure Voting System</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You have requested an OTP for <strong>${purpose}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #333; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP is valid for 5 minutes and can only be used once.</p>
          <p style="color: #f44336;"><strong>Note:</strong> If you did not request this, please ignore this email or contact support if you suspect unauthorized access.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP SERVICE] Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[OTP SERVICE] Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  generateOTP,
  sendOTP,
};
