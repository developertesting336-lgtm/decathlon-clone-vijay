import express from "express";
import authMiddleware, { getVerifiedUserFromRequest } from "../middleware/authMiddleware.js";
import {
  createPriceAlert,
  getPriceAlertStatus,
  getMyPriceAlerts,
  deletePriceAlert,
} from "../controllers/priceAlertController.js";

const router = express.Router();

const optionalAuth = (req, res, next) => {
  try {
    const user = getVerifiedUserFromRequest(req);
    if (user) req.user = user;
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
};

router.post("/", optionalAuth, createPriceAlert);
router.get("/status/:productId", optionalAuth, getPriceAlertStatus);
router.get("/my-alerts", authMiddleware, getMyPriceAlerts);
router.delete("/:id", optionalAuth, deletePriceAlert);

export default router;
