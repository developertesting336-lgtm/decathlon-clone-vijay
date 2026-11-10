import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { issueOtp, consumeOtp } from "../utils/otpHelper.js";

const parseAndValidateLoginTarget = (body) => {
  const { type, email, phone } = body;
  if (type !== "email" && type !== "phone") {
    return { error: "Valid login type is required" };
  }
  const normalizedEmail = type === "email" ? email?.trim().toLowerCase() : undefined;
  const normalizedPhone = type === "phone" ? phone?.trim() : undefined;
  if (type === "email" && !normalizedEmail) return { error: "Email is required" };
  if (type === "phone" && !normalizedPhone) return { error: "Phone number is required" };
  return { type, normalizedEmail, normalizedPhone };
};

const sendLoginOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateLoginTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const user = await User.findOne(
      type === "email"
        ? { email: normalizedEmail, role: "user" }
        : { phone: normalizedPhone, role: "user" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    const result = await issueOtp({
      type,
      email: normalizedEmail,
      phone: normalizedPhone,
      purpose: "Login",
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Send Login OTP Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Failed to send login OTP",
    });
  }
};

const resendLoginOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateLoginTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const user = await User.findOne(
      type === "email"
        ? { email: normalizedEmail, role: "user" }
        : { phone: normalizedPhone, role: "user" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    const result = await issueOtp({
      type,
      email: normalizedEmail,
      phone: normalizedPhone,
      purpose: "Login",
    });

    return res.status(200).json({ ...result, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend Login OTP Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Failed to resend login OTP",
    });
  }
};

const loginWithOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateLoginTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const user = await User.findOne(
      type === "email"
        ? { email: normalizedEmail, role: "user" }
        : { phone: normalizedPhone, role: "user" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    const check = await consumeOtp({
      type,
      email: normalizedEmail,
      phone: normalizedPhone,
      otp,
    });
    if (!check.ok) {
      return res.status(check.status).json({ message: check.message });
    }

    if (typeof user.recordLogin === "function") {
      await user.recordLogin();
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("OTP Login Error:", error);
    return res.status(500).json({ message: "Failed to login with OTP" });
  }
};

export { sendLoginOtp, resendLoginOtp, loginWithOtp };
