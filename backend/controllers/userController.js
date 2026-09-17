import User from "../models/User.js";

export const generateCardNumberForUser = (user) => {
  // Preserve original card number for primary test account
  if (user.email === "vk7184192@gmail.com") {
    return "2 094724 479967";
  }

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

    // Assign unique card number if missing or default on different user
    if (!user.cardNumber || (user.cardNumber === "2 094724 479967" && user.email !== "vk7184192@gmail.com")) {
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
