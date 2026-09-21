import jwt from "jsonwebtoken";
import User from "../models/User.js";
import googleAuthService from "../services/googleAuthService.js";
import { generateCardNumberForUser } from "./userController.js";

/**
 * POST /api/login/google or POST /api/auth/google
 * Step 1 of Two-Step Google Authentication:
 * Verifies the Google ID token, checks if the email/user exists in MongoDB,
 * and issues a tamper-proof short-lived confirmationToken.
 * Does NOT immediately create or log in the user.
 */
export const googleLogin = async (req, res) => {
  try {
    const rawToken =
      req.body?.credential ||
      req.body?.token ||
      req.body?.idToken ||
      req.body?.id_token;

    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return res.status(400).json({
        message: "Google credential or token is required",
      });
    }

    const token = rawToken.trim();

    // Verify token using google-auth-library
    let googleUser;
    try {
      googleUser = await googleAuthService.verifyGoogleIdToken(token);
    } catch (verifyError) {
      console.error("Google Token Verification Failed:", verifyError.message);
      return res.status(401).json({
        message: "Invalid or expired Google token",
        error: verifyError.message,
      });
    }

    const { googleId, email, name, picture, emailVerified } = googleUser;

    if (!email) {
      return res.status(400).json({
        message: "Google account does not provide an email address",
      });
    }

    if (!emailVerified) {
      return res.status(400).json({
        message: "Google account email is not verified by Google",
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the Google user already exists in MongoDB
    const existingUser = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    });

    const userExists = Boolean(existingUser);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is missing in environment variables");
      return res.status(500).json({
        message: "Internal server error: auth configuration missing",
      });
    }

    // Sign a short-lived (10 minutes) confirmation token containing verified Google data
    const confirmationToken = jwt.sign(
      {
        type: "google_confirmation",
        googleId,
        email: normalizedEmail,
        name: name ? name.trim() : "",
        picture: picture || "",
        emailVerified,
        userExists,
      },
      jwtSecret,
      {
        expiresIn: "10m",
      },
    );

    // Return required confirmation payload without logging user in yet
    return res.status(200).json({
      success: true,
      requiresConfirmation: true,
      userExists,
      email: normalizedEmail,
      confirmationToken,
    });
  } catch (error) {
    console.error("Google Login Step 1 Error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred during Google verification",
      error: error.message,
    });
  }
};

/**
 * POST /api/login/google/confirm or POST /api/auth/google/confirm
 * Step 2 of Two-Step Google Authentication:
 * Called when the user clicks NEXT on the "Additional information" screen.
 * Verifies the short-lived confirmationToken, links or creates the account,
 * and issues the official application JWT authToken.
 */
export const confirmGoogleLogin = async (req, res) => {
  try {
    const confirmationToken = req.body?.confirmationToken;

    if (!confirmationToken || typeof confirmationToken !== "string" || !confirmationToken.trim()) {
      return res.status(400).json({
        message: "Confirmation token is required",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is missing in environment variables");
      return res.status(500).json({
        message: "Internal server error: auth configuration missing",
      });
    }

    // Verify confirmation token
    let decoded;
    try {
      decoded = jwt.verify(confirmationToken.trim(), jwtSecret);
    } catch (tokenErr) {
      return res.status(401).json({
        message: "Confirmation session has expired or is invalid. Please sign in with Google again.",
        error: tokenErr.message,
      });
    }

    if (decoded?.type !== "google_confirmation" || !decoded?.googleId || !decoded?.email) {
      return res.status(400).json({
        message: "Invalid confirmation token payload",
      });
    }

    const { googleId, email, name, picture } = decoded;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user exists by googleId
    let user = await User.findOne({ googleId });

    if (user) {
      // User found by googleId; update profile info if needed
      let hasUpdates = false;

      if (!user.avatar && picture) {
        user.avatar = picture;
        hasUpdates = true;
      }

      if (!user.name && name) {
        user.name = name.trim();
        hasUpdates = true;
      }

      if (!user.cardNumber) {
        user.cardNumber = generateCardNumberForUser(user);
        hasUpdates = true;
      }

      if (hasUpdates) {
        await user.save();
      }
    } else {
      // 2. User not found by googleId; check if user exists with the same email
      user = await User.findOne({ email: normalizedEmail });

      if (user) {
        // CASE 1 — EXISTING EMAIL: Link Google ID to existing account
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            message: "Account is already linked to a different Google account",
          });
        }

        user.googleId = googleId;

        if (!user.avatar && picture) {
          user.avatar = picture;
        }

        if (!user.name && name) {
          user.name = name.trim();
        }

        if (!user.cardNumber) {
          user.cardNumber = generateCardNumberForUser(user);
        }

        await user.save();
      } else {
        // CASE 2 — NEW EMAIL: Create new user
        const userName = name && name.trim() ? name.trim() : normalizedEmail.split("@")[0];

        const newUser = new User({
          name: userName,
          email: normalizedEmail,
          googleId,
          avatar: picture || "",
          role: "user",
          isPhoneVerified: false,
        });

        newUser.cardNumber = generateCardNumberForUser(newUser);

        await newUser.save();
        user = newUser;
      }
    }

    // Generate JWT token with identical format to existing login system
    const authToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      },
    );

    // Return identical response structure as existing login
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Confirm Google Login Error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred during account confirmation",
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me or GET /auth/me
 * Returns current authenticated user profile using authMiddleware.
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        googleId: user.googleId,
        cardNumber: user.cardNumber,
        designation: user.designation,
        dob: user.dob,
        gender: user.gender,
        isPhoneVerified: user.isPhoneVerified,
        communicationPreferences: user.communicationPreferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch current user profile",
    });
  }
};

export default {
  googleLogin,
  confirmGoogleLogin,
  getMe,
};
