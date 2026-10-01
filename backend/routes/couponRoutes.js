import express from "express";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons,
  getMyCouponUsage,
  getCouponUsageHistory,
} from "../controllers/couponController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/*
========================================
CUSTOMER ROUTES
========================================
*/

// GET /api/coupons/available - Get active coupons for customers (Step 10)
router.get("/available", authMiddleware, getAvailableCoupons);

// GET /api/coupons/my-usage - Get current user's coupon usage history (Step 9.2)
router.get("/my-usage", authMiddleware, getMyCouponUsage);

// POST /api/coupons/validate - Validate coupon against cart total (Step 7.5, 8.1, 13.3)
router.post("/validate", authMiddleware, validateCoupon);

/*
========================================
COUPON ROUTES (ADMIN PROTECTED)
========================================
*/

// POST /api/coupons - Create a new coupon
router.post("/", authMiddleware, adminMiddleware, createCoupon);

// GET /api/coupons - List all coupons
router.get("/", authMiddleware, adminMiddleware, getCoupons);

// GET /api/coupons/:couponId/usage - Admin coupon usage history (Step 9.3)
router.get("/:couponId/usage", authMiddleware, adminMiddleware, getCouponUsageHistory);

// GET /api/coupons/:id - Get a single coupon by ID
router.get("/:id", authMiddleware, adminMiddleware, getCouponById);

// PUT /api/coupons/:id - Update an existing coupon
router.put("/:id", authMiddleware, adminMiddleware, updateCoupon);

// DELETE /api/coupons/:id - Delete a coupon
router.delete("/:id", authMiddleware, adminMiddleware, deleteCoupon);

export default router;
