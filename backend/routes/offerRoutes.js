import express from "express";
import {
  getAdminOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getActivePublicOffers,
} from "../controllers/offerController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* =====================================================
   PUBLIC ROUTES
===================================================== */
router.get("/active", getActivePublicOffers);

/* =====================================================
   ADMIN ROUTES (Protected by authMiddleware & adminMiddleware)
===================================================== */
router.get("/admin", authMiddleware, adminMiddleware, getAdminOffers);
router.post("/admin", authMiddleware, adminMiddleware, createOffer);
router.get("/admin/:id", authMiddleware, adminMiddleware, getOfferById);
router.put("/admin/:id", authMiddleware, adminMiddleware, updateOffer);
router.patch("/admin/:id/toggle", authMiddleware, adminMiddleware, toggleOfferStatus);
router.delete("/admin/:id", authMiddleware, adminMiddleware, deleteOffer);

export default router;
