const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT);

if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
  throw new Error("SMTP_PORT must be a valid port number.");
}

const smtpSecure =
  String(process.env.SMTP_SECURE).toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendPasswordResetEmail = async ({
  to,
  name,
  resetUrl
}) => {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("MAIL_FROM is not configured.");
  }

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your password",
    text: `Hello ${name},

We received a request to reset your password.

Use the link below to create a new password:

${resetUrl}

This link will expire in 15 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email.

Regards,
MERN Authentication App`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>

        <p>Hello ${name},</p>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Click the button below to create a new password:
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link will expire in <strong>15 minutes</strong>
          and can only be used once.
        </p>

        <p>
          If you did not request a password reset, you can safely ignore this email.
        </p>

        <p>Regards,<br />MERN Authentication App</p>
      </div>
    `
  });
};

module.exports = {
  sendPasswordResetEmail
};