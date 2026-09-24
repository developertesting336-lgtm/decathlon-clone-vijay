import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  testAdminNotification,
  deleteNotification,
  clearReadNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

// Public VAPID key fetch
router.get("/vapid-public-key", getVapidPublicKey);

// Push subscription endpoints (require authenticated user)
router.post("/subscribe", authMiddleware, subscribePush);
router.delete("/unsubscribe", authMiddleware, unsubscribePush);

// Notifications list, mark read, and delete
router.get("/", authMiddleware, getMyNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsAsRead);
router.patch("/:id/read", authMiddleware, markNotificationAsRead);
router.delete("/clear-read", authMiddleware, clearReadNotifications);
router.delete("/:id", authMiddleware, deleteNotification);

// Testing endpoint for Admin popups & notifications
router.post("/test-admin", authMiddleware, testAdminNotification);

export default router;
