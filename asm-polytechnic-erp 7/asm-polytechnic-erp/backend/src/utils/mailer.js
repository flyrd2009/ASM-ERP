const nodemailer = require("nodemailer");

const port = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465, // true for implicit TLS (465), false for STARTTLS (587/2525)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Without these, an unreachable/misconfigured SMTP server (common on
  // restrictive networks that block outbound mail ports) hangs for
  // nodemailer's default timeouts — which run into minutes. Even though
  // every send is fire-and-forget now (never blocks the HTTP response),
  // failing fast here means errors show up in the logs promptly instead
  // of leaving slow background connections piling up.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || "ASM Polytechnic ERP <no-reply@asmpolytechnic.edu>",
    to,
    subject,
    html,
  });
}

function otpEmailTemplate(otp, purpose) {
  if (purpose === "account_created") {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#1d3557;">Welcome to ASM Polytechnic ERP</h2>
        <p>An account has been created for you. Use this temporary password to log in — you'll be asked to set your own right away.</p>
        <p style="font-size: 22px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p style="color:#666; font-size: 13px;">If you weren't expecting this account, please contact the ERP administrator.</p>
      </div>
    `;
  }

  if (purpose === "account_unlocked") {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#1d3557;">Your ASM ERP account was reset</h2>
        <p>Your previous password no longer works. Use this temporary password to log in — you'll be required to set your own immediately.</p>
        <p style="font-size: 22px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p style="color:#666; font-size: 13px;">If you didn't expect this, contact the ERP administrator right away.</p>
      </div>
    `;
  }

  const purposeText = {
    password_reset: "reset your password",
    otp_login: "log in to your account",
  }[purpose] || "verify your identity";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#1d3557;">ASM Polytechnic ERP</h2>
      <p>Use the code below to ${purposeText}. This code expires in 15 minutes.</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p style="color:#666; font-size: 13px;">If you did not request this, please contact the ERP administrator immediately.</p>
    </div>
  `;
}

function newDeviceAlertTemplate({ ip, device, time }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#1d3557;">New login to your ERP account</h2>
      <p>We noticed a login from a new device or location:</p>
      <ul>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Device:</strong> ${device}</li>
        <li><strong>IP Address:</strong> ${ip}</li>
      </ul>
      <p style="color:#666; font-size: 13px;">If this wasn't you, reset your password immediately and contact the admin office.</p>
    </div>
  `;
}

module.exports = { sendMail, otpEmailTemplate, newDeviceAlertTemplate };
