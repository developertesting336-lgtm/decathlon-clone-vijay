import nodemailer from "nodemailer";

/**
 * Clean and format SMTP credentials from environment
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  // Remove any whitespace from Gmail app password if present
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    // Useful options for Gmail SMTP reliability
    tls: {
      rejectUnauthorized: false,
    },
  });
};

let transporterInstance = null;

export const getMailTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = getTransporter();
  }
  return transporterInstance;
};

/**
 * Send an email using Nodemailer and Gmail SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {string} [options.replyTo] - Reply-To email address
 * @returns {Promise<Object>} Nodemailer sendMail info
 */
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
}) => {
  const transporter = getMailTransporter();
  const fromAddress = process.env.SMTP_USER || "noreply@decathlon.com";

  const mailOptions = {
    from: `"Decathlon Support" <${fromAddress}>`,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || fromAddress,
  };

  return await transporter.sendMail(mailOptions);
};

export default {
  sendEmail,
  getMailTransporter,
};
