import express from "express";
import {
  getPages,
  getPublicPages,
  getPageBySlug,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  addPageSection,
  updatePageSection,
  deletePageSection,
  reorderPageSections,
  getSectionPreview,
} from "../controllers/pageController.js";
import {
  getPageSections,
  createPageSection,
  updatePageSection as updateDedicatedSection,
  deletePageSection as deleteDedicatedSection,
  reorderPageSections as reorderDedicatedSections,
} from "../controllers/pageSectionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { getSingleImageUrl } from "../utils/uploadToCloudinary.js";

const router = express.Router();

// Upload image for custom section items
router.post(
  "/upload",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const url = await getSingleImageUrl(req.file, "pages");
      return res.status(200).json({ success: true, url });
    } catch (error) {
      console.error("Page Image Upload Error:", error);
      return res.status(500).json({ message: error.message });
    }
  }
);

// Public routes for Store Frontend
router.get("/navigation", getPublicPages);
router.get("/public", getPublicPages);
router.get("/slug/:slug", getPageBySlug);
router.get("/public/:slug", getPageBySlug);

// Standalone or embedded section preview route
router.get("/preview/:pageId/:sectionId", getSectionPreview);

// Public or Admin by ID/slug
router.get("/:idOrSlug", (req, res, next) => {
  if (req.params.idOrSlug && req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    return authMiddleware(req, res, () => adminMiddleware(req, res, () => {
      req.params.id = req.params.idOrSlug;
      return getPageById(req, res, next);
    }));
  }
  req.params.slug = req.params.idOrSlug;
  return getPageBySlug(req, res, next);
});

// Admin protected routes
router.get("/", authMiddleware, adminMiddleware, getPages);
router.post("/", authMiddleware, adminMiddleware, createPage);
router.put("/:id", authMiddleware, adminMiddleware, updatePage);
router.delete("/:id", authMiddleware, adminMiddleware, deletePage);

// Page sections management routes
router.get("/:id/sections", getPageSections);
router.put("/:id/sections/reorder", authMiddleware, adminMiddleware, reorderDedicatedSections);
router.post("/:id/sections", authMiddleware, adminMiddleware, createPageSection);
router.put("/:id/sections/:sectionId", authMiddleware, adminMiddleware, updateDedicatedSection);
router.delete("/:id/sections/:sectionId", authMiddleware, adminMiddleware, deleteDedicatedSection);

export default router;
