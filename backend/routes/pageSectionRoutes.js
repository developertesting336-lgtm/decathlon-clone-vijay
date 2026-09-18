import express from "express";
import {
  getPageSections,
  createPageSection,
  updatePageSection,
  deletePageSection,
  duplicatePageSection,
  reorderPageSections,
} from "../controllers/pageSectionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Reorder routes
router.put("/reorder/:pageId", authMiddleware, adminMiddleware, reorderPageSections);
router.put("/:sectionId/reorder", authMiddleware, adminMiddleware, reorderPageSections);

// Duplicate section
router.post("/:sectionId/duplicate", authMiddleware, adminMiddleware, duplicatePageSection);

// Single section updates / deletes
router.put("/:sectionId", authMiddleware, adminMiddleware, updatePageSection);
router.delete("/:sectionId", authMiddleware, adminMiddleware, deletePageSection);

// Sections by pageId
router.get("/page/:pageId", getPageSections);
router.post("/page/:pageId", authMiddleware, adminMiddleware, createPageSection);

export default router;
