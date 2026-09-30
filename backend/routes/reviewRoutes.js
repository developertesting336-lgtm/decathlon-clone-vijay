import express from "express";
import {
  createReview,
  getReviewsByProduct,
  getReviewById,
  updateReview,
  deleteReview,
  getAllReviews,
} from "../controllers/reviewController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Admin: view all reviews
router.get("/", authMiddleware, adminMiddleware, getAllReviews);

// Create review (requires logged in user)
router.post("/", authMiddleware, createReview);

// Get reviews for a product
router.get("/product/:productId", getReviewsByProduct);

// Get single review
router.get("/:reviewId", getReviewById);

// Update review (owner or admin)
router.put("/:reviewId", authMiddleware, updateReview);

// Delete review (owner or admin)
router.delete("/:reviewId", authMiddleware, deleteReview);

export default router;
