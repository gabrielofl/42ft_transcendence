import nodemailer from 'nodemailer';

const {
  MAIL_FROM_NAME = 'Pong Arena',
  MAIL_FROM_EMAIL = 'no-reply@example.test',
  MAIL_GMAIL_USER,
  MAIL_GMAIL_APP_PASSWORD,
} = process.env;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: MAIL_GMAIL_USER,
    pass: MAIL_GMAIL_APP_PASSWORD,
  },
});

export async function verifyMailer() {
  await transporter.verify();
  console.log('[mail] Gmail transporter ready');
}

function fromHeader() {
  return `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`;
}

export async function sendPasswordResetOTP({ to, otp, expiresInMinutes = 15 }) {
  return transporter.sendMail({
    from: fromHeader(),
    to,
    subject: `Your password reset code: ${otp}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>We received a request to reset your password.</p>
        <p>Your one-time code:</p>
        <p style="font-size:22px;letter-spacing:3px;font-weight:700;">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
        <p>If this wasn’t you, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendBackupResetSuccess({ to }) {
  return transporter.sendMail({
    from: fromHeader(),
    to,
    subject: 'Your password has been reset',
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Your password was successfully reset using a backup code.</p>
        <p>If this wasn’t you, update your password and review 2FA settings right away.</p>
      </div>
    `,
  });
}

export async function send2FAEnabled({ to, backupCodes = [] }) {
  return transporter.sendMail({
    from: fromHeader(),
    to,
    subject: '2FA enabled on your account',
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Two-factor authentication has been enabled on your account.</p>
        ${
          backupCodes.length
            ? `<p><strong>Backup codes (store safely):</strong></p>
               <ul>${backupCodes.map(c => `<li style="font-family:monospace">${c}</li>`).join('')}</ul>`
            : '<p>(No backup codes included.)</p>'
        }
      </div>
    `,
  });
}
