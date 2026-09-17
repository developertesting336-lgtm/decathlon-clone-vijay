import User from "../models/User.js";
import Otp from "../models/Otp.js";
import jwt from "jsonwebtoken";
import generateOtp from "../utils/generateOtp.js";

const sendOtp = async (req, res) => {
  try {
    const { type, email, phone } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid registration type is required",
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

    const existingUser =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
          })
        : await User.findOne({
            phone: normalizedPhone,
          });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists. Please login.",
      });
    }

    const otp = generateOtp();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany(
      type === "email"
        ? {
            email: normalizedEmail,
          }
        : {
            phone: normalizedPhone,
          },
    );

    await Otp.create({
      email: type === "email" ? normalizedEmail : undefined,

      phone: type === "phone" ? normalizedPhone : undefined,

      otp,
      expiresAt,
    });

    console.log(`Registration OTP for ${type}: ${otp}`);

    return res.status(200).json({
      message: "OTP sent successfully",

      // Development only
      otp,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);

    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { type, email, phone } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid registration type is required",
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

    const existingUser =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
          })
        : await User.findOne({
            phone: normalizedPhone,
          });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists. Please login.",
      });
    }

    const previousOtp =
      type === "email"
        ? await Otp.findOne({
            email: normalizedEmail,
          }).sort({
            createdAt: -1,
          })
        : await Otp.findOne({
            phone: normalizedPhone,
          }).sort({
            createdAt: -1,
          });

    if (previousOtp) {
      const elapsed = Date.now() - new Date(previousOtp.createdAt).getTime();

      const cooldown = 60 * 1000;

      if (elapsed < cooldown) {
        const remaining = Math.ceil((cooldown - elapsed) / 1000);

        return res.status(429).json({
          message: `Please wait ${remaining} seconds before requesting another OTP.`,
          remainingSeconds: remaining,
        });
      }
    }

    const otp = generateOtp();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany(
      type === "email"
        ? {
            email: normalizedEmail,
          }
        : {
            phone: normalizedPhone,
          },
    );

    await Otp.create({
      email: type === "email" ? normalizedEmail : undefined,

      phone: type === "phone" ? normalizedPhone : undefined,

      otp,
      expiresAt,
    });

    console.log(`Resent Registration OTP for ${type}: ${otp}`);

    return res.status(200).json({
      message: "OTP resent successfully",

      // Development only
      otp,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);

    return res.status(500).json({
      message: "Failed to resend OTP",
    });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const { type, email, phone, otp } = req.body;

    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Valid registration type is required",
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

    const existingUser =
      type === "email"
        ? await User.findOne({
            email: normalizedEmail,
          })
        : await User.findOne({
            phone: normalizedPhone,
          });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists. Please login.",
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
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    await Otp.findByIdAndDelete(otpRecord._id);

    /*
    Temporary name until account
    details modal is implemented.
    */

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
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
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

    return res.status(500).json({
      message: "Failed to complete registration",
    });
  }
};

export { sendOtp, resendOtp, verifyRegistrationOtp };
