import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  syncWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/sync", authMiddleware, syncWishlist);

router.post("/", authMiddleware, addToWishlist);

router.get("/", authMiddleware, getWishlist);

router.delete("/", authMiddleware, clearWishlist);

router.delete("/:productId", authMiddleware, removeFromWishlist);

export default router;