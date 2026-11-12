import User from "../models/User.js";
import Address from "../models/Address.js";
import Cart from "../models/cart.js";
import Wishlist from "../models/Wishlist.js";
import Notification from "../models/Notification.js";
import AiChatHistory from "../models/AiChatHistory.js";
import PushSubscription from "../models/PushSubscription.js";
import StockNotification from "../models/StockNotification.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import SupportTicket from "../models/SupportTicket.js";
import CouponUsage from "../models/CouponUsage.js";
import Otp from "../models/Otp.js";
import { issueOtp, consumeOtp } from "../utils/otpHelper.js";

export const generateCardNumberForUser = (user) => {
  // Derive unique 13-digit Decathlon card number: 2 XXXXXX XXXXXX from user._id
  const idStr = user._id ? user._id.toString() : "user" + Date.now();
  let hash1 = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash1 = (hash1 * 37 + idStr.charCodeAt(i)) >>> 0;
  }
  const p1 = String(100000 + (hash1 % 900000));

  let hash2 = 5381;
  for (let i = idStr.length - 1; i >= 0; i--) {
    hash2 = ((hash2 << 5) + hash2 + idStr.charCodeAt(i)) >>> 0;
  }
  const p2 = String(100000 + (hash2 % 900000));

  return `2 ${p1} ${p2}`;
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.cardNumber) {
      user.cardNumber = generateCardNumberForUser(user);
      await user.save();
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(500).json({ message: error.message || "Failed to get profile" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, dob, gender } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) user.name = name.trim();
    if (dob !== undefined) user.dob = dob.trim();
    if (gender !== undefined) user.gender = gender.trim();

    if (email !== undefined && email.trim() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingEmail) {
        return res.status(400).json({ message: "This email address is already in use." });
      }
      user.email = normalizedEmail;
    }

    if (phone !== undefined && phone.trim() !== user.phone) {
      const normalizedPhone = phone.trim();
      const existingPhone = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: user._id },
      });
      if (existingPhone) {
        return res.status(400).json({ message: "This phone number is already in use." });
      }
      user.phone = normalizedPhone;
      user.isPhoneVerified = true;
    }

    if (req.body.communicationPreferences !== undefined) {
      const existing = user.communicationPreferences ? user.communicationPreferences.toObject() : {};
      user.communicationPreferences = {
        ...existing,
        ...req.body.communicationPreferences,
      };
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    return res.status(200).json({
      message: "Personal information updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update User Profile Error:", error);
    return res.status(500).json({ message: error.message || "Failed to update profile" });
  }
};


export const sendDeleteAccountOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.email) {
      return res.status(400).json({
        message: "No email address is linked to this account. Please add an email in Personal information first.",
      });
    }

    const email = user.email.toLowerCase().trim();
    const result = await issueOtp({
      type: "email",
      email,
      purpose: "Account Deletion",
    });

    return res.status(200).json({
      message: result.message || "One-time verification code sent to your email",
    });
  } catch (error) {
    console.error("Send Delete Account OTP Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send verification code",
    });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const otpInput = String(req.body?.otp || req.query?.otp || "").trim();
    if (!otpInput) {
      return res.status(400).json({ message: "Please enter the verification code sent to your email" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.email) {
      return res.status(400).json({ message: "No email address linked to this account" });
    }

    const email = user.email.toLowerCase().trim();
    const verification = await consumeOtp({
      type: "email",
      email,
      otp: otpInput,
    });
    if (!verification.ok) {
      return res.status(verification.status || 400).json({
        message: verification.message || "Invalid or expired verification code",
      });
    }

    const otpFilters = [{ email }];
    if (user.phone) {
      otpFilters.push({ phone: user.phone });
    }

    await Promise.allSettled([
      Address.deleteMany({ user: userId }),
      Cart.deleteMany({ user: userId }),
      Wishlist.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
      AiChatHistory.deleteMany({ user: userId }),
      PushSubscription.deleteMany({ user: userId }),
      StockNotification.deleteMany({ user: userId }),
      Order.deleteMany({ user: userId }),
      Review.deleteMany({ user: userId }),
      SupportTicket.deleteMany({ user: userId }),
      CouponUsage.deleteMany({ userId }),
      Otp.deleteMany({ $or: otpFilters }),
    ]);

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: "Your account has been permanently deleted",
    });
  } catch (error) {
    console.error("Delete User Account Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to delete account",
    });
  }
};
