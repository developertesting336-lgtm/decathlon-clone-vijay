import express from "express";

import {
  createOrder,
  confirmCODOrder,
  confirmOnlineOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  requestOrderReturn,
  updateOrderReturnStatus,
  processReturnRefund,
  requestOrderExchange,
  updateOrderExchangeStatus,
  getOrderTracking,
  updateOrderTracking,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* USER - CREATE ORDER */
router.post("/", authMiddleware, createOrder);

/* USER - MY ORDERS */
router.get("/my-orders", authMiddleware, getMyOrders);

/* ADMIN - ALL ORDERS */
router.get("/admin/all", authMiddleware, adminMiddleware, getAllOrders);

/* USER - CONFIRM COD */
router.put("/:id/cod", authMiddleware, confirmCODOrder);

/* USER - CONFIRM ONLINE PAYMENT */
router.put("/:id/confirm-online", authMiddleware, confirmOnlineOrder);

/* ADMIN - UPDATE PAYMENT STATUS */
router.put(
  "/:id/payment-status",
  authMiddleware,
  adminMiddleware,
  updatePaymentStatus,
);

/* USER - CANCEL ORDER */
router.put("/:id/cancel", authMiddleware, cancelOrder);

/* USER - REQUEST RETURN */
router.post("/:id/return", authMiddleware, requestOrderReturn);

/* ADMIN - UPDATE RETURN STATUS */
router.put(
  "/:id/return-status",
  authMiddleware,
  adminMiddleware,
  updateOrderReturnStatus,
);

/* ADMIN - PROCESS RETURN REFUND (STRIPE / COD) */
router.post(
  "/:id/process-return-refund",
  authMiddleware,
  adminMiddleware,
  processReturnRefund,
);

/* USER - REQUEST EXCHANGE */
router.post("/:id/exchange", authMiddleware, requestOrderExchange);

/* ADMIN - UPDATE EXCHANGE STATUS */
router.put(
  "/:id/exchange-status",
  authMiddleware,
  adminMiddleware,
  updateOrderExchangeStatus,
);

/* ADMIN - UPDATE ORDER STATUS */
router.put("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);

/* USER / ADMIN - GET ORDER TRACKING */
router.get("/:id/tracking", authMiddleware, getOrderTracking);

/* ADMIN - UPDATE ORDER TRACKING */
router.put(
  "/:id/tracking",
  authMiddleware,
  adminMiddleware,
  updateOrderTracking,
);

/* USER - SINGLE ORDER */
router.get("/:id", authMiddleware, getOrderById);

export default router;       