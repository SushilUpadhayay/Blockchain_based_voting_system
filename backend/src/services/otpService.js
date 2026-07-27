const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Use connection pooling for better performance
  maxConnections: 5,
  maxMessages: 100,
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
    console.log(`[OTP SERVICE] Email (${purpose}) successfully sent to: ${user.email} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[OTP SERVICE] Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Cryptographically hash a 6-digit OTP to prevent database exposure.
 * Uses SHA-256 for fast and highly secure verification.
 * @param {string} otp - Raw 6-digit OTP
 * @returns {string} - Hashed hex digest
 */
const hashOTP = (otp) => {
  if (!otp) throw new Error('OTP is required for hashing');
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Send registration status notification email
 * @param {Object} user - User object containing email and name
 * @param {string} status - Registration status ('pending', 'approved'|'registered', 'rejected', 'blocked')
 * @param {string} [reason] - Admin provided rejection or block reason
 */
const sendStatusNotificationEmail = async (user, status, reason = '') => {
  try {
    let subject = '';
    let bodyText = '';
    let headerColor = '#3b82f6';

    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'pending') {
      subject = 'Registration Submitted';
      bodyText = `Your registration has been successfully submitted and is currently under review by the registration verifier. You will receive another email once your registration has been approved, rejected, or blocked.`;
      headerColor = '#3b82f6';
    } else if (normalizedStatus === 'approved' || normalizedStatus === 'registered') {
      subject = 'Registration Approved';
      bodyText = `Congratulations! Your registration has been approved. You can now log in to the system and participate in the election once voting begins.`;
      headerColor = '#10b981';
    } else if (normalizedStatus === 'rejected') {
      subject = 'Registration Rejected';
      bodyText = `Unfortunately, your registration has been rejected.
<br/><br/>
<strong>Reason:</strong><br/>
<div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 10px 0; color: #991b1b; border-radius: 4px;">${reason || 'No reason provided.'}</div>
If you still wish to participate, please complete the registration process again using the election registration link.`;
      headerColor = '#f97316';
    } else if (normalizedStatus === 'blocked') {
      subject = 'Account Blocked';
      bodyText = `Your account has been blocked by the election administrator. You will no longer be able to log in or participate in this election. If you believe this is an error, please contact the election administrator.`;
      headerColor = '#dc2626';
    } else {
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: ${headerColor}; text-align: center;">${subject}</h2>
          <p>Hello <strong>${user.name || 'Voter'}</strong>,</p>
          <div style="font-size: 14px; line-height: 1.6; color: #333; margin: 20px 0;">
            ${bodyText}
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from Election Management Platform. Please do not reply.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[STATUS EMAIL SERVICE] ${subject} email sent to: ${user.email} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[STATUS EMAIL SERVICE] Error sending notification email:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  hashOTP,
  sendStatusNotificationEmail,
};
