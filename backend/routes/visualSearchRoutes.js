import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { visualProductSearch } from "../controllers/visualSearchController.js";

const router = express.Router();

// POST /api/products/visual-search (supports multipart file field 'image' or 'photo')
router.post("/", upload.single("image"), visualProductSearch);

export default router;
