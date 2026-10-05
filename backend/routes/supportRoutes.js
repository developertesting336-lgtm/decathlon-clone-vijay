import express from "express";
import {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  getFaqsByCategory,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  getFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  updateFaqStatus,
  deleteFaq,
  searchFaqs,
} from "../controllers/supportController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getAdminTickets,
  getAdminTicketById,
  getAdminTicketStats,
  updateTicketStatus,
  updateTicketPriority,
  respondToTicket,
} from "../controllers/supportTicketController.js";

const router = express.Router();

/*
==================================================
PUBLIC SUPPORT ROUTES
==================================================
*/

// GET /api/support/categories - Get all active categories with FAQ counts
router.get("/categories", getCategories);

// GET /api/support/categories/admin - Admin: Get all categories (active & inactive)
router.get("/categories/admin", authMiddleware, adminMiddleware, getAllCategoriesAdmin);

// GET /api/support/categories/:categoryId - Get category and its active FAQs by ID
router.get("/categories/:categoryId", getCategoryById);

// GET /api/support/faqs/category/:categoryId - Get active FAQs for a specific category ID
router.get("/faqs/category/:categoryId", getFaqsByCategory);

// GET /api/support/search?q=refund - Search FAQs by query
router.get("/search", searchFaqs);

// GET /api/support/faqs - Get FAQs with optional filters (category, status, search, pagination)
router.get("/faqs", getFaqs);

// GET /api/support/faqs/:faqId - Get single FAQ by ID
router.get("/faqs/:faqId", getFaqById);

/*
==================================================
ADMIN PROTECTED SUPPORT ROUTES
==================================================
*/

// Category Management
router.post("/categories", authMiddleware, adminMiddleware, createCategory);
router.put("/categories/:categoryId", authMiddleware, adminMiddleware, updateCategory);
router.patch("/categories/:categoryId/status", authMiddleware, adminMiddleware, updateCategoryStatus);
router.delete("/categories/:categoryId", authMiddleware, adminMiddleware, deleteCategory);

// FAQ Management
router.post("/faqs", authMiddleware, adminMiddleware, createFaq);
router.put("/faqs/:faqId", authMiddleware, adminMiddleware, updateFaq);
router.patch("/faqs/:faqId/status", authMiddleware, adminMiddleware, updateFaqStatus);
router.delete("/faqs/:faqId", authMiddleware, adminMiddleware, deleteFaq);

/*
==================================================
ADMIN SUPPORT TICKET ROUTES
Mounted at: /api/support/admin/tickets
==================================================
*/
router.get("/admin/tickets", authMiddleware, adminMiddleware, getAdminTickets);
router.get("/admin/tickets/stats", authMiddleware, adminMiddleware, getAdminTicketStats);
router.get("/admin/tickets/:ticketId", authMiddleware, adminMiddleware, getAdminTicketById);
router.patch("/admin/tickets/:ticketId/status", authMiddleware, adminMiddleware, updateTicketStatus);
router.patch("/admin/tickets/:ticketId/priority", authMiddleware, adminMiddleware, updateTicketPriority);
router.patch("/admin/tickets/:ticketId/respond", authMiddleware, adminMiddleware, respondToTicket);

export default router;
