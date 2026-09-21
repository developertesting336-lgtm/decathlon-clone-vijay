import express from "express";

import {
  registerUser,
  loginUser,
  getAllUsers,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from "../controllers/adminController.js";
import {
  googleLogin,
  confirmGoogleLogin,
  getMe,
} from "../controllers/googleAuthController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/google", googleLogin);

router.post("/google/confirm", confirmGoogleLogin);


router.get("/me", authMiddleware, getMe);

router.get("/profile", authMiddleware, getAdminProfile);

router.put(
  "/profile",
  authMiddleware,
  adminMiddleware,
  upload.single("avatar"),
  updateAdminProfile,
);

router.put(
  "/change-password",
  authMiddleware,
  adminMiddleware,
  changeAdminPassword,
);

router.get(
  "/admin/users",
  authMiddleware,
  adminMiddleware,
  getAllUsers
);

export default router;