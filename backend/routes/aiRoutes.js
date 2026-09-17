import express from "express";
import jwt from "jsonwebtoken";
import {
  handleAIChat,
  getUserChatHistory,
  clearUserChatHistory,
  createUserSupportTicket,
  getAdminSupportTickets,
  updateSupportTicketStatus,
  getUserSupportTickets,
} from "../controllers/aiController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getKnowledgeList,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getAiLiveStats
} from "../controllers/aiKnowledgeController.js";

const router = express.Router();

/**
 * Optional Authentication Middleware
 * Checks if a user is logged in so the AI can retrieve order status,
 * but allows unauthenticated visitors to freely chat.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
    }
  } catch (error) {
    // Gracefully ignore token errors for public chat
  }
  next();
};

// Live AI Chatbot Endpoint
router.post("/chat", optionalAuth, handleAIChat);

// Authenticated User Chat History Endpoints
router.get("/history", optionalAuth, getUserChatHistory);
router.delete("/history", optionalAuth, clearUserChatHistory);

// Live Dynamic Database Statistics
router.get("/stats", getAiLiveStats);

// Dynamic AI Knowledge CRUD Endpoints (MongoDB backed)
router.get("/knowledge", getKnowledgeList);
router.get("/knowledge/:id", getKnowledgeById);
router.post("/knowledge", createKnowledge);
router.put("/knowledge/:id", updateKnowledge);
router.delete("/knowledge/:id", deleteKnowledge);

// Support Ticket Endpoints
router.post("/support-ticket", optionalAuth, createUserSupportTicket);
router.get("/user-support-tickets", authMiddleware, getUserSupportTickets);
router.get("/support-tickets", authMiddleware, adminMiddleware, getAdminSupportTickets);
router.patch("/support-ticket/:id", authMiddleware, adminMiddleware, updateSupportTicketStatus);

export default router;
