import express from "express";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlistController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addToWishlist);

router.get("/", authMiddleware, getWishlist);

router.delete("/:productId", authMiddleware, removeFromWishlist);

export default router;