import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  generateVirtualTryOn,
  getPresetModels,
  getTryOnCredits,
} from "../controllers/tryOnController.js";

const router = express.Router();

// GET /api/try-on/models - Get preset standard Decathlon models
router.get("/models", getPresetModels);

// GET /api/try-on/credits - Get available Genlook credit balance
router.get("/credits", getTryOnCredits);

// POST /api/try-on/generate - Run AI Virtual Try-On via Genlook API
router.post(
  "/generate",
  upload.fields([
    { name: "userImage", maxCount: 1 },
    { name: "garmentImage", maxCount: 1 },
  ]),
  generateVirtualTryOn
);

export default router;
