import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSingleImageUrl } from "../utils/uploadToCloudinary.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        message: "Name, password and email or phone are required",
      });
    }

    const normalizedEmail = email?.trim().toLowerCase();

    const normalizedPhone = phone?.trim();

    const query = normalizedEmail
      ? { email: normalizedEmail }
      : { phone: normalizedPhone };

    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),

      email: normalizedEmail || undefined,

      phone: normalizedPhone || undefined,

      password: hashedPassword,

      role: "user",
    });

    res.status(201).json({
      message: "User registered successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register User Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        message: "Email or phone and password are required",
      });
    }

    const normalizedEmail = email?.trim().toLowerCase();

    const normalizedPhone = phone?.trim();

    const query = normalizedEmail
      ? { email: normalizedEmail }
      : { phone: normalizedPhone };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email/phone or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email/phone or password",
      });
    }

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

    res.status(200).json({
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
    console.error("Login User Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
    })
      .select("-password")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "Admin profile not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Admin Profile Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phone, avatar, designation } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
    const normalizedPhone = phone ? phone.trim() : undefined;

    // Check for conflict with other users
    if (normalizedEmail || normalizedPhone) {
      const conflictQuery = [];
      if (normalizedEmail) conflictQuery.push({ email: normalizedEmail });
      if (normalizedPhone) conflictQuery.push({ phone: normalizedPhone });

      const existingUser = await User.findOne({
        $or: conflictQuery,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        if (existingUser.email === normalizedEmail) {
          return res.status(400).json({
            message: "Email is already in use by another account",
          });
        }
        if (existingUser.phone === normalizedPhone) {
          return res.status(400).json({
            message: "Phone number is already in use by another account",
          });
        }
      }
    }

    if (name) user.name = name.trim();
    if (normalizedEmail !== undefined) user.email = normalizedEmail;
    if (normalizedPhone !== undefined) user.phone = normalizedPhone;
    if (designation !== undefined) user.designation = designation;

    if (req.file) {
      try {
        const uploadedAvatar = await getSingleImageUrl(req.file, "decathlon/avatars");
        if (uploadedAvatar) {
          user.avatar = uploadedAvatar;
        }
      } catch (uploadErr) {
        console.warn("Avatar Cloudinary upload error:", uploadErr.message);
      }
    } else if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        designation: user.designation,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update Admin Profile Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Both current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password does not match",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export {
  registerUser,
  loginUser,
  getAllUsers,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
};

