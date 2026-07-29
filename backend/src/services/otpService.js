const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
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
 * Cryptographically hash a 6-digit OTP (SHA-256)
 */
const hashOTP = (otp) => {
  if (!otp) throw new Error('OTP is required for hashing');
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Send registration status notification email
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
    } else if (normalizedStatus === 'registered') {
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

/**
 * Send registration invitation email to roster voter.
 * @param {Object} params - { email, fullName, electionTitle, inviteToken, registrationDeadline }
 */
const sendRosterInvitationEmail = async ({ email, fullName, electionTitle, inviteToken, registrationDeadline }) => {
  try {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const inviteUrl = `${frontendOrigin}/register?token=${inviteToken}`;
    const recipientName = fullName || 'Voter';
    const deadlineHtml = registrationDeadline
      ? `<p style="background-color:#fff7ed;border-left:4px solid #f97316;padding:10px 14px;border-radius:4px;font-size:13px;color:#7c2d12;margin:16px 0;">
           ⏰ <strong>Registration Deadline:</strong> ${new Date(registrationDeadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
         </p>`
      : '';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Invitation to Register: ${electionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4F46E5; text-align: center;">Official Election Invitation</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>You have been invited to participate as an eligible voter in <strong>${electionTitle}</strong>.</p>
          ${deadlineHtml}
          <p><strong>How to register:</strong></p>
          <ol style="font-size: 14px; line-height: 1.8; color: #374151;">
            <li>Click the button below to open the registration form</li>
            <li>Upload a photo of your citizenship document</li>
            <li>Connect your MetaMask wallet to link your identity</li>
            <li>Submit your application — a Voter Verifier will review it</li>
            <li>Once approved, you'll receive an email and can log in to vote</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Register for Election</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6366F1;"><a href="${inviteUrl}">${inviteUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This invitation is unique to your email. Do not forward this link.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[ROSTER INVITE] Invitation email sent to: ${email} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[ROSTER INVITE] Error sending invitation email:', error);
    return false;
  }
};

/**
 * Send verifier onboarding invitation email (invite link)
 */
const sendVerifierInvitationEmail = async ({ email, name, electionTitle, inviteToken }) => {
  try {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const inviteUrl = `${frontendOrigin}/verifier/register?token=${inviteToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Registration Verifier Invitation: ${electionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4F46E5; text-align: center;">Verifier Onboarding Invitation</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You have been invited by the Election Administrator to serve as an official <strong>Registration Verifier</strong> for <strong>${electionTitle}</strong>.</p>
          <p>Please click the button below to start your verifier registration:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Accept Verifier Invitation</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6366F1;"><a href="${inviteUrl}">${inviteUrl}</a></p>
          <div style="background-color: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 0; font-size: 13px; color: #374151;">
              <strong>Security Notice:</strong> Your secret <strong>One-Time Invitation Code</strong> is <em>not</em> included in this email. You must request this code directly from your Election Administrator via a trusted channel (secure message, phone, or in person).
            </p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This invitation link is valid only until the election registration period ends. Do not share or forward this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[VERIFIER INVITE] Invitation email sent to: ${email} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[VERIFIER INVITE] Error sending invitation email:', error);
    return false;
  }
};

/**
 * Send "Election Created Successfully" confirmation email to the Election Administrator.
 * Called after verifySuperAdminOtp deploys the election on-chain.
 * @param {Object} params - { email, name, electionTitle, electionId, txHash }
 */
const sendElectionCreatedEmail = async ({ email, name, electionTitle, electionId, txHash }) => {
  try {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const setupUrl = `${frontendOrigin}/elections/${electionId}/setup`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Election Created Successfully: ${electionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #10b981; text-align: center;">🗳️ Election Deployed Successfully</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your election has been successfully created and deployed to the blockchain. Here are the details:</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; color: #065f46;">
              <tr><td style="padding: 4px 0; font-weight: bold;">Election Title:</td><td>${electionTitle}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Election ID:</td><td>#${electionId}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Role:</td><td>Election Administrator</td></tr>
              ${txHash ? `<tr><td style="padding: 4px 0; font-weight: bold;">Tx Hash:</td><td style="font-family: monospace; font-size: 11px; word-break: break-all;">${txHash}</td></tr>` : ''}
            </table>
          </div>
          <p><strong>Next Steps:</strong></p>
          <ol style="font-size: 14px; line-height: 1.8; color: #374151;">
            <li>Add candidates to the blockchain</li>
            <li>Upload the eligible voter roster (Excel)</li>
            <li>Invite Registration Verifiers</li>
            <li>Open voter registration to send invitation emails</li>
            <li>Start the election when ready</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Election Setup</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from VoteChain. Please do not reply.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[ELECTION CREATED EMAIL] Sent to: ${email} for election #${electionId} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[ELECTION CREATED EMAIL] Error sending email:', error);
    return false;
  }
};

/**
 * Send role confirmation email to a verifier after completing self-registration.
 * @param {Object} params - { email, name, electionTitle, electionId }
 */
const sendVerifierRoleConfirmationEmail = async ({ email, name, electionTitle, electionId }) => {
  try {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const dashboardUrl = `${frontendOrigin}/elections/${electionId}/verifier`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `You are now a Voter Verifier: ${electionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #7c3aed; text-align: center;">✅ Voter Verifier Role Assigned</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You have been successfully registered as an official <strong>Voter Verifier</strong> for:</p>
          <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; color: #5b21b6; margin: 0;">${electionTitle}</p>
            <p style="font-size: 12px; color: #7c3aed; margin: 4px 0 0;">Election ID: #${electionId}</p>
          </div>
          <p><strong>Your responsibilities as a Voter Verifier:</strong></p>
          <ul style="font-size: 14px; line-height: 1.8; color: #374151;">
            <li>Review pending voter registrations in your dashboard</li>
            <li>Verify uploaded citizenship documents (OCR-assisted)</li>
            <li>Approve or reject voter applications with a reason</li>
            <li>Approved voters are automatically authorized on the blockchain</li>
          </ul>
          <p><strong>How to log in:</strong></p>
          <ol style="font-size: 14px; line-height: 1.8; color: #374151;">
            <li>Go to the VoteChain platform and click <strong>Login</strong></li>
            <li>Select <strong>Admin / Verifier</strong> tab</li>
            <li>Enter your email and the password you set during registration</li>
            <li>Complete OTP verification — you'll be redirected to your dashboard</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Verifier Dashboard</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from VoteChain. Please do not reply.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[VERIFIER ROLE EMAIL] Sent to: ${email} for election #${electionId} (Message-ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[VERIFIER ROLE EMAIL] Error sending confirmation email:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  hashOTP,
  sendStatusNotificationEmail,
  sendRosterInvitationEmail,
  sendVerifierInvitationEmail,
  sendElectionCreatedEmail,
  sendVerifierRoleConfirmationEmail,
};
