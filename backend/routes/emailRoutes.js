import express from "express";
import { sendSupportEmail } from "../controllers/emailController.js";

const router = express.Router();

/**
 * POST /api/email/send
 * Public customer support email endpoint
 */
router.post("/send", sendSupportEmail);

export default router;
