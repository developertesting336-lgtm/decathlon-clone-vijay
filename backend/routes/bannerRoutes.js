import express from "express";

import {
  createBanner,
  getBanners,
  getActiveBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";


const router = express.Router();

router.get(
  "/active/:type",
  getActiveBanner
);

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getBanners
);

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  createBanner
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  updateBanner
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteBanner
);

export default router;