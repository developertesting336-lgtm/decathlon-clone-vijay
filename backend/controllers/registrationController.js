import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { issueOtp, consumeOtp } from "../utils/otpHelper.js";

const parseAndValidateRegistrationTarget = (body) => {
  const { type, email, phone } = body;
  if (type !== "email" && type !== "phone") {
    return { error: "Valid registration type is required" };
  }
  const normalizedEmail = type === "email" ? email?.trim().toLowerCase() : undefined;
  const normalizedPhone = type === "phone" ? phone?.trim() : undefined;
  if (type === "email" && !normalizedEmail) return { error: "Email is required" };
  if (type === "phone" && !normalizedPhone) return { error: "Phone number is required" };
  return { type, normalizedEmail, normalizedPhone };
};

const sendOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateRegistrationTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const existingUser = await User.findOne(
      type === "email" ? { email: normalizedEmail } : { phone: normalizedPhone }
    );

    if (existingUser) {
      return res.status(409).json({ message: "User already exists. Please login." });
    }

    const result = await issueOtp({
      type,
      email: normalizedEmail,
      phone: normalizedPhone,
      purpose: "Registration",
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Failed to send OTP",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateRegistrationTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const existingUser = await User.findOne(
      type === "email" ? { email: normalizedEmail } : { phone: normalizedPhone }
    );

    if (existingUser) {
      return res.status(409).json({ message: "User already exists. Please login." });
    }

    const result = await issueOtp({
      type,
      email: normalizedEmail,
      phone: normalizedPhone,
      purpose: "Registration",
    });

    return res.status(200).json({ ...result, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Failed to resend OTP",
    });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const parsed = parseAndValidateRegistrationTarget(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const { type, normalizedEmail, normalizedPhone } = parsed;
    const existingUser = await User.findOne(
      type === "email" ? { email: normalizedEmail } : { phone: normalizedPhone }
    );

    if (existingUser) {
      return res.status(409).json({ message: "User already exists. Please login." });
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

    const defaultName =
      type === "email"
        ? normalizedEmail.split("@")[0]
        : `User${normalizedPhone.slice(-4)}`;

    const user = await User.create({
      name: defaultName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: "user",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Registration successful",
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
    console.error("Verify Registration OTP Error:", error);
    return res.status(500).json({ message: "Failed to complete registration" });
  }
};

export { sendOtp, resendOtp, verifyRegistrationOtp };
