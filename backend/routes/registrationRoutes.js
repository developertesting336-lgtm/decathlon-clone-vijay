import express from "express";

import {
  sendOtp,
  resendOtp,
  verifyRegistrationOtp,
} from "../controllers/registrationController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);

router.post("/resend-otp", resendOtp);

router.post(
  "/verify-otp",
  verifyRegistrationOtp
);

export default router;