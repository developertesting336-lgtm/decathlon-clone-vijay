import express from "express";
import { getUserProfile, updateUserProfile, sendDeleteAccountOtp, deleteUserAccount } from "../controllers/userController.js";
import { getMe } from "../controllers/googleAuthController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.post("/account/delete-otp", authMiddleware, sendDeleteAccountOtp);
router.delete("/account", authMiddleware, deleteUserAccount);
router.delete("/profile", authMiddleware, deleteUserAccount);

export default router;
