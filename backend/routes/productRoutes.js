import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.array("images", 5),
  createProduct,
);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.array("images", 5),
  updateProduct,
);

router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

export default router;
