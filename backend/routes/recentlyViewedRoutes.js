import express from "express";
import {
  recordProductView,
  getRecentlyViewed,
  clearRecentlyViewed,
} from "../controllers/recentlyViewedController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Record view (POST /api/recently-viewed)
router.post("/", authMiddleware, recordProductView);

// Get user's recently viewed products (GET /api/recently-viewed)
router.get("/", authMiddleware, getRecentlyViewed);

// Clear all recently viewed products (DELETE /api/recently-viewed)
router.delete("/", authMiddleware, clearRecentlyViewed);

// Remove specific product from recently viewed (DELETE /api/recently-viewed/:productId)
router.delete("/:productId", authMiddleware, clearRecentlyViewed);

export default router;
