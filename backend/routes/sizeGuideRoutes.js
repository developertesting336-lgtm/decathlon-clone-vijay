import express from "express";
import {
  getSizeGuides,
  getSizeGuideById,
  getSizeGuideByCategory,
  createSizeGuide,
  updateSizeGuide,
  deleteSizeGuide,
} from "../controllers/sizeGuideController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Public: get all active size guides
router.get("/", getSizeGuides);

// Public: get size guide by category
router.get("/category/:categoryId", getSizeGuideByCategory);

// Public: get size guide by ID
router.get("/:id", getSizeGuideById);

// Admin: create size guide
router.post("/", authMiddleware, adminMiddleware, createSizeGuide);

// Admin: update size guide
router.put("/:id", authMiddleware, adminMiddleware, updateSizeGuide);

// Admin: delete size guide
router.delete("/:id", authMiddleware, adminMiddleware, deleteSizeGuide);

export default router;
