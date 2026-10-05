import express from "express";
import {
  createTicket,
  getCustomerTickets,
  getTicketById,
  closeTicket,
  getAdminTickets,
  getAdminTicketById,
  getAdminTicketStats,
  updateTicketStatus,
  updateTicketPriority,
  respondToTicket,
} from "../controllers/supportTicketController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/*
==================================================
CUSTOMER TICKET ROUTES
Mounted at: /api/support/tickets
==================================================
*/

// POST /api/support/tickets - Customer: Create new ticket
router.post("/", authMiddleware, createTicket);

// GET /api/support/tickets - Customer: List user's tickets
router.get("/", authMiddleware, getCustomerTickets);

// GET /api/support/tickets/:ticketId - Customer: View single ticket details
router.get("/:ticketId", authMiddleware, getTicketById);

// PATCH /api/support/tickets/:ticketId/close - Customer: Close open/in_progress ticket
router.patch("/:ticketId/close", authMiddleware, closeTicket);

/*
==================================================
ADMIN TICKET ROUTES
Mounted at: /api/support/tickets/admin/... (and also via supportRoutes)
==================================================
*/
router.get("/admin/all", authMiddleware, adminMiddleware, getAdminTickets);
router.get("/admin/stats", authMiddleware, adminMiddleware, getAdminTicketStats);
router.get("/admin/:ticketId", authMiddleware, adminMiddleware, getAdminTicketById);
router.patch("/admin/:ticketId/status", authMiddleware, adminMiddleware, updateTicketStatus);
router.patch("/admin/:ticketId/priority", authMiddleware, adminMiddleware, updateTicketPriority);
router.patch("/admin/:ticketId/respond", authMiddleware, adminMiddleware, respondToTicket);

export default router;
