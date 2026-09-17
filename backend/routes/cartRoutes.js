import express from "express";
import { addToCart, getCart, updateCartQuantity, removeFromCart,clearCart} from "../controllers/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addToCart);

router.get("/", authMiddleware, getCart);

router.put("/:productId", authMiddleware, updateCartQuantity);

router.delete("/:productId", authMiddleware, removeFromCart);

router.delete("/",authMiddleware,clearCart);

export default router;