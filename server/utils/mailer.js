/**
 * Email utility using Nodemailer.
 *
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Falls back to Ethereal test account when SMTP_HOST is not set
 * (emails go to a preview URL logged to the console — great for development).
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

let _transporter = null;

async function getTransporter() {
    if (_transporter) return _transporter;

    if (process.env.SMTP_HOST) {
        // Production / real SMTP
        _transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        logger.info('Mailer: using SMTP transport', { host: process.env.SMTP_HOST });
    } else {
        // Development fallback — Ethereal
        const testAccount = await nodemailer.createTestAccount();
        _transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
        logger.info('Mailer: using Ethereal test account', { user: testAccount.user });
    }

    return _transporter;
}

/**
 * Send a password reset email.
 * @param {string} to     — recipient email
 * @param {string} resetUrl — the full URL with the token
 */
async function sendPasswordResetEmail(to, resetUrl) {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"CardVault" <noreply@cardvault.app>',
        to,
        subject: 'Reset Your CardVault Password',
        html: `
            <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background: #0d1117; color: #c9d1d9; border-radius: 16px; padding: 40px 32px; border: 1px solid #21262d;">
                <h1 style="font-size: 1.3rem; color: #58a6ff; margin: 0 0 16px;">CardVault</h1>
                <p style="font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px;">
                    We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
                </p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #58a6ff, #bc8cff); color: #0d1117; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 0.95rem;">
                    Reset Password
                </a>
                <p style="font-size: 0.82rem; color: #8b949e; margin-top: 28px; line-height: 1.5;">
                    If you didn't request this, you can safely ignore this email. Your password won't change.
                </p>
                <hr style="border: none; border-top: 1px solid #21262d; margin: 24px 0;" />
                <p style="font-size: 0.75rem; color: #484f58; margin: 0;">
                    Can't click the button? Copy and paste this URL into your browser:<br/>
                    <a href="${resetUrl}" style="color: #58a6ff; word-break: break-all;">${resetUrl}</a>
                </p>
            </div>
        `,
    });

    // Log preview URL for Ethereal (dev only)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        logger.info('Password reset email preview URL', { previewUrl });
    }

    logger.info('Password reset email sent', { to, messageId: info.messageId });
    return { messageId: info.messageId, previewUrl: previewUrl || null };
}

module.exports = { sendPasswordResetEmail };
