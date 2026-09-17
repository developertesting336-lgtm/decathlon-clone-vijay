import User from "../models/User.js";
import Otp from "../models/Otp.js";
import jwt from "jsonwebtoken";
import generateOtp from "../utils/generateOtp.js";

const sendLoginOtp = async (req, res) => {
  try {
    const { type, email, phone } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid login type is required",
      });
    }

    const normalizedEmail =
      type === "email" ? email?.trim().toLowerCase() : undefined;

    const normalizedPhone = type === "phone" ? phone?.trim() : undefined;

    if (type === "email" && !normalizedEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    if (type === "phone" && !normalizedPhone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const user =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
            role: "user",
          })
        : await User.findOne({
            phone: normalizedPhone,
            role: "user",
          });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register first.",
      });
    }

    const otp = generateOtp();

    await Otp.deleteMany(
      type === "email"
        ? { email: normalizedEmail }
        : { phone: normalizedPhone },
    );

    await Otp.create({
      email: type === "email" ? normalizedEmail : undefined,
      phone: type === "phone" ? normalizedPhone : undefined,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log(`Login OTP for ${type}: ${otp}`);

    return res.status(200).json({
      message: "OTP sent successfully",
      otp,
    });
  } catch (error) {
    console.error("Send Login OTP Error:", error);

    return res.status(500).json({
      message: "Failed to send login OTP",
    });
  }
};

const resendLoginOtp = async (req, res) => {
  try {
    const { type, email, phone } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid login type is required",
      });
    }

    const normalizedEmail =
      type === "email" ? email?.trim().toLowerCase() : undefined;

    const normalizedPhone = type === "phone" ? phone?.trim() : undefined;

    const user =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
            role: "user",
          })
        : await User.findOne({
            phone: normalizedPhone,
            role: "user",
          });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register first.",
      });
    }

    const previousOtp =
      type === "email"
        ? await Otp.findOne({
            email: normalizedEmail,
          }).sort({ createdAt: -1 })
        : await Otp.findOne({
            phone: normalizedPhone,
          }).sort({ createdAt: -1 });

    if (previousOtp && previousOtp.expiresAt > new Date()) {
      const remainingSeconds = Math.ceil(
        (new Date(previousOtp.expiresAt).getTime() - Date.now()) / 1000,
      );

      return res.status(400).json({
        message: `Please wait ${remainingSeconds} seconds until the current OTP expires.`,
        remainingSeconds,
      });
    }

    const otp = generateOtp();

    await Otp.deleteMany(
      type === "email"
        ? { email: normalizedEmail }
        : { phone: normalizedPhone },
    );

    await Otp.create({
      email: type === "email" ? normalizedEmail : undefined,
      phone: type === "phone" ? normalizedPhone : undefined,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log(`Resent Login OTP for ${type}: ${otp}`);

    return res.status(200).json({
      message: "OTP resent successfully",
      otp,
    });
  } catch (error) {
    console.error("Resend Login OTP Error:", error);

    return res.status(500).json({
      message: "Failed to resend login OTP",
    });
  }
};

const loginWithOtp = async (req, res) => {
  try {
    const { type, email, phone, otp } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid login type is required",
      });
    }

    if (!otp) {
      return res.status(400).json({
        message: "OTP is required",
      });
    }

    const normalizedEmail =
      type === "email" ? email?.trim().toLowerCase() : undefined;

    const normalizedPhone = type === "phone" ? phone?.trim() : undefined;

    const user =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
            role: "user",
          })
        : await User.findOne({
            phone: normalizedPhone,
            role: "user",
          });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register first.",
      });
    }

    const otpRecord =
      type === "email"
        ? await Otp.findOne({
            email: normalizedEmail,
            otp: otp.trim(),
          })
        : await Otp.findOne({
            phone: normalizedPhone,
            otp: otp.trim(),
          });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.findByIdAndDelete(otpRecord._id);

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    await Otp.findByIdAndDelete(otpRecord._id);

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
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

    return res.status(500).json({
      message: "Failed to login with OTP",
    });
  }
};

export { sendLoginOtp, resendLoginOtp, loginWithOtp };
