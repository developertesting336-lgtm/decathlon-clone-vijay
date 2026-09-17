import express from "express";

import {
  createPaymentIntent,
  verifyPayment,
} from "../controllers/paymentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-payment-intent", authMiddleware, createPaymentIntent);

router.post("/verify-payment", authMiddleware, verifyPayment);

export default router;
