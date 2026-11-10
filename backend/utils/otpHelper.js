import Otp from "../models/Otp.js";
import generateOtp from "./generateOtp.js";
import { sendEmail } from "./emailService.js";

const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

/**
 * Create and dispatch an OTP for login or registration, enforcing resend cooldown
 * and never leaking email OTPs in production responses or logs.
 */
export const issueOtp = async ({ type, email, phone, purpose = "Login" }) => {
  const query = type === "email" ? { email } : { phone };

  const existing = await Otp.findOne(query).sort({ createdAt: -1 });
  if (existing && existing.createdAt) {
    const elapsed = Date.now() - new Date(existing.createdAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${waitSec}s before requesting another OTP.`);
      err.statusCode = 429;
      throw err;
    }
  }

  if (type === "phone" && process.env.NODE_ENV === "production") {
    const err = new Error("SMS OTP delivery is not configured. Please use Email or Google Sign-In.");
    err.statusCode = 501;
    throw err;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await Otp.deleteMany(query);
  await Otp.create({
    email: type === "email" ? email : undefined,
    phone: type === "phone" ? phone : undefined,
    otp,
    attempts: 0,
    expiresAt,
  });

  if (type === "email" && email) {
    await sendEmail({
      to: email,
      subject: `Your Decathlon ${purpose} OTP: ${otp}`,
      text: `Your Decathlon ${purpose.toLowerCase()} OTP is ${otp}. It is valid for 5 minutes. Please do not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2 style="color: #0082c3; margin: 0 0 10px;">DECATHLON</h2>
          <h3>${purpose} Verification Code</h3>
          <p>Your one-time password (OTP) for Decathlon is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0082c3; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color: #555; font-size: 13px;">This code is valid for 5 minutes. Do not share this OTP with anyone.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">Decathlon Sports India</p>
        </div>
      `,
    });
  }

  const payload = { message: "OTP sent successfully" };
  if (type === "phone" && process.env.NODE_ENV !== "production") {
    payload.devOtp = otp;
  }
  return payload;
};

/**
 * Verify an OTP against stored record with expiry and brute-force attempt protection.
 */
export const consumeOtp = async ({ type, email, phone, otp }) => {
  const query = type === "email" ? { email } : { phone };
  const otpRecord = await Otp.findOne(query).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { ok: false, status: 400, message: "Invalid or expired OTP" };
  }

  if (otpRecord.expiresAt < new Date()) {
    await Otp.findByIdAndDelete(otpRecord._id);
    return { ok: false, status: 400, message: "OTP has expired. Please request a new OTP." };
  }

  if (otpRecord.otp !== String(otp).trim()) {
    const nextAttempts = (otpRecord.attempts || 0) + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await Otp.findByIdAndDelete(otpRecord._id);
      return {
        ok: false,
        status: 429,
        message: "Too many invalid OTP attempts. Please request a new OTP.",
      };
    }
    otpRecord.attempts = nextAttempts;
    await otpRecord.save();
    return { ok: false, status: 400, message: "Invalid OTP" };
  }

  await Otp.findByIdAndDelete(otpRecord._id);
  return { ok: true };
};
