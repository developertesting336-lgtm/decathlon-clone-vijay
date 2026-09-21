import express from "express";
import { getUserProfile, updateUserProfile } from "../controllers/userController.js";
import { getMe } from "../controllers/googleAuthController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);

export default router;
