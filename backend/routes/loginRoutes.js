import express from "express";

import {
  sendLoginOtp,
  resendLoginOtp,
  loginWithOtp,
} from "../controllers/loginController.js";

const router = express.Router();

router.post("/send-otp", sendLoginOtp);

router.post("/resend-otp", resendLoginOtp);

router.post("/verify-otp", loginWithOtp);

export default router;
