import express from "express";
import { getPersonalizedRecommendations } from "../controllers/recommendationController.js";

const router = express.Router();

// GET /api/recommendations/for-you
router.get("/for-you", getPersonalizedRecommendations);

export default router;
