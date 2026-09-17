import { sendEmail } from "../utils/emailService.js";

/**
 * Basic in-memory rate limiter per IP
 * Limit: 5 requests per 10 minutes per IP
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

// Clean up stale IP entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000);

const isRateLimited = (ip) => {
  const now = Date.now();
  const data = rateLimitMap.get(ip);

  if (!data) {
    rateLimitMap.set(ip, { count: 1, firstRequestTime: now });
    return false;
  }

  if (now - data.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    // Window expired, reset
    rateLimitMap.set(ip, { count: 1, firstRequestTime: now });
    return false;
  }

  data.count += 1;
  return data.count > MAX_REQUESTS_PER_WINDOW;
};

/**
 * Escape HTML characters to prevent HTML/script injection in email
 */
const escapeHtml = (text = "") => {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Email format validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/email/send
 * Controller to handle sending customer support email
 */
export const sendSupportEmail = async (req, res) => {
  try {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    // Check rate limit
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        message: "Too many messages sent. Please wait a few minutes before trying again.",
      });
    }

    const { name, email, message, subject: customSubject } = req.body || {};

    // 1. Validate name
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide your name.",
      });
    }

    // 2. Validate email presence & format
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email address.",
      });
    }

    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 3. Validate message presence & length
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a message.",
      });
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanMessage = message.trim().slice(0, 5000);

    // Escape inputs for safe HTML email rendering
    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail);
    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, "<br/>");

    // Email recipient (store support / admin email)
    const recipientEmail =
      process.env.SUPPORT_RECEIVER_EMAIL ||
      process.env.SMTP_USER ||
      "developertesting336@gmail.com";

    // Plain text version
    const textContent = `New Customer Support Message - Decathlon Clone

Customer Name: ${cleanName}
Customer Email: ${cleanEmail}

Message:
${cleanMessage}

---
Sent via Decathlon Clone Customer Support Portal.
`;

    const htmlContent = `
      <h2>New Customer Support Message</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <h3>Message</h3>
      <p>${safeMessage}</p>
    `;

    const emailSubject = customSubject
      ? `New Customer Support Message: ${customSubject}`
      : `New Customer Support Message - Decathlon Clone (${cleanName})`;

    // Send email using Nodemailer
    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      replyTo: cleanEmail,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    // Log server-side only for debugging - do not leak sensitive information to client
    console.error("sendSupportEmail error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};

export default {
  sendSupportEmail,
};
