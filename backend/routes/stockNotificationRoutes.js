import express from "express";
import {
  subscribeToStockNotification,
  getMyStockNotifications,
  unsubscribeFromStockNotification,
  getAdminStockNotifications,
} from "../controllers/stockNotificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Admin: view all stock notifications and metrics
router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  getAdminStockNotifications,
);

// Subscribe to restock alert (logged in user or guest with email)
router.post("/", subscribeToStockNotification);

// Get authenticated user's active subscriptions
router.get("/my", authMiddleware, getMyStockNotifications);

// Unsubscribe from restock alerts for a product
router.delete("/:productId", unsubscribeFromStockNotification);

export default router;
