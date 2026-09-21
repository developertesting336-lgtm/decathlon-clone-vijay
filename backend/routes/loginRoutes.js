import express from "express";

import {
  sendLoginOtp,
  resendLoginOtp,
  loginWithOtp,
} from "../controllers/loginController.js";
import {
  googleLogin,
  confirmGoogleLogin,
} from "../controllers/googleAuthController.js";

const router = express.Router();

router.post("/send-otp", sendLoginOtp);

router.post("/resend-otp", resendLoginOtp);

router.post("/verify-otp", loginWithOtp);

router.post("/google", googleLogin);

router.post("/google/confirm", confirmGoogleLogin);

export default router;

