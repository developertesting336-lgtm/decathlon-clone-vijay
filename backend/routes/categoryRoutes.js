import express from "express";

import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategory,
} from "../controllers/categoryController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  createCategory,
);

router.put("/reorder", authMiddleware, adminMiddleware, reorderCategory);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  updateCategory,
);  

router.delete("/:id", authMiddleware, adminMiddleware, deleteCategory);

export default router;
