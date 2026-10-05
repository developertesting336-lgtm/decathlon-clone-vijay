import mongoose from "mongoose";
import SupportTicket from "../models/SupportTicket.js";
import SupportCategory from "../models/SupportCategory.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { emitSupportTicketUpdate } from "../socket/socketManager.js";
import {
  sendNotification,
  sendAdminNotification,
} from "../services/notificationService.js";

const VALID_ISSUE_TYPES = [
  "order",
  "payment",
  "delivery",
  "return",
  "exchange",
  "refund",
  "product",
  "account",
  "other",
];

const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
const VALID_PRIORITIES = ["low", "medium", "high"];

/*
==================================================
CUSTOMER CONTROLLERS
==================================================
*/

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Private (Customer)
 */
export const createTicket = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to submit a support ticket",
      });
    }

    const { category, order, issueType, subject, message } = req.body;

    // 1. Validate required fields
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // 2. Validate issueType
    const normalizedIssueType = (issueType || "other").toLowerCase().trim();
    if (!VALID_ISSUE_TYPES.includes(normalizedIssueType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid issue type. Allowed types: ${VALID_ISSUE_TYPES.join(", ")}`,
      });
    }

    // 3. Validate category if provided
    let categoryObjectId = null;
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format",
        });
      }
      const categoryExists = await SupportCategory.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Specified support category does not exist",
        });
      }
      categoryObjectId = categoryExists._id;
    }

    // 4. Validate order if provided
    let orderObjectId = null;
    if (order) {
      if (!mongoose.Types.ObjectId.isValid(order)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID format",
        });
      }

      const orderDoc = await Order.findById(order);
      if (!orderDoc) {
        return res.status(400).json({
          success: false,
          message: "Specified order was not found",
        });
      }

      // Ensure the order belongs to the authenticated user
      const currentUserIdStr = userId.toString();
      const orderUserStr = (
        orderDoc.user?._id ||
        orderDoc.user ||
        orderDoc.userId ||
        orderDoc.customer
      )?.toString();

      if (orderUserStr && orderUserStr !== currentUserIdStr) {
        return res.status(403).json({
          success: false,
          message: "You can only create a support ticket for your own orders.",
        });
      }

      orderObjectId = orderDoc._id;
    }

    // 5. Create Support Ticket
    const newTicket = await SupportTicket.create({
      user: userId,
      order: orderObjectId,
      category: categoryObjectId,
      issueType: normalizedIssueType,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
      priority: "medium",
    });

    const populatedTicket = await SupportTicket.findById(newTicket._id)
      .populate("category", "name icon description")
      .populate("order", "_id orderStatus totalAmount createdAt orderItems")
      .lean();

    // 6. Real-time notification via Socket.IO
    try {
      emitSupportTicketUpdate("support_ticket_created", populatedTicket);
    } catch (socketErr) {
      // Non-fatal
    }

    // 7. Notify Admins (Step 14.2)
    try {
      const customerName = req.user?.name || req.user?.email || "A customer";
      await sendAdminNotification({
        title: "New support request received",
        body: `${customerName} submitted a ticket: "${subject.trim()}" [${normalizedIssueType.toUpperCase()}]`,
        type: "SUPPORT_TICKET",
        url: `/admin/support/tickets/${newTicket._id}`,
        orderId: orderObjectId,
      });
    } catch (adminNotifErr) {
      console.error("Admin notification for support ticket failed:", adminNotifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully",
      ticket: populatedTicket,
    });
  } catch (error) {
    console.error("createTicket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create support ticket",
    });
  }
};

/**
 * @desc    Get all support tickets for authenticated customer
 * @route   GET /api/support/tickets
 * @access  Private (Customer)
 */
export const getCustomerTickets = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const tickets = await SupportTicket.find({ user: userId })
      .populate("category", "name icon")
      .populate("order", "_id orderStatus totalAmount createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("getCustomerTickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support tickets",
    });
  }
};

/**
 * @desc    Get single support ticket by ID for authenticated customer
 * @route   GET /api/support/tickets/:ticketId
 * @access  Private (Customer)
 */
export const getTicketById = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID is required",
      });
    }

    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await SupportTicket.findById(ticketId)
        .populate("category", "name icon description")
        .populate("order", "_id orderStatus totalAmount createdAt orderItems")
        .lean();
    } else {
      ticket = await SupportTicket.findOne({ ticketId })
        .populate("category", "name icon description")
        .populate("order", "_id orderStatus totalAmount createdAt orderItems")
        .lean();
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Check ownership (admins can view via admin route or if user role is admin)
    const currentUserIdStr = userId?.toString();
    const ticketUserIdStr = (ticket.user?._id || ticket.user)?.toString();

    if (ticketUserIdStr && ticketUserIdStr !== currentUserIdStr && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this ticket.",
      });
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("getTicketById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve support ticket",
    });
  }
};

/**
 * @desc    Close an open or in-progress support ticket by customer
 * @route   PATCH /api/support/tickets/:ticketId/close
 * @access  Private (Customer)
 */
export const closeTicket = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { ticketId } = req.params;

    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await SupportTicket.findById(ticketId);
    } else {
      ticket = await SupportTicket.findOne({ ticketId });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    // Ownership check
    const currentUserIdStr = userId?.toString();
    const ticketUserIdStr = (ticket.user?._id || ticket.user)?.toString();

    if (ticketUserIdStr && ticketUserIdStr !== currentUserIdStr && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only close your own support tickets.",
      });
    }

    const currentStatus = (ticket.status || "").toLowerCase();
    if (currentStatus === "closed" || currentStatus === "resolved") {
      return res.status(400).json({
        success: false,
        message: `This ticket is already ${currentStatus}.`,
      });
    }

    ticket.status = "closed";
    ticket.resolvedAt = new Date();
    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate("category", "name icon description")
      .populate("order", "_id orderStatus totalAmount createdAt orderItems")
      .lean();

    try {
      emitSupportTicketUpdate("closed", populated);
    } catch (socketErr) {
      // Non-fatal
    }

    return res.status(200).json({
      success: true,
      message: "Support ticket closed successfully",
      ticket: populated,
    });
  } catch (error) {
    console.error("closeTicket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close support ticket",
    });
  }
};

/*
==================================================
ADMIN CONTROLLERS
==================================================
*/

/**
 * @desc    Get all support tickets for admin with filters and search
 * @route   GET /api/support/admin/tickets
 * @access  Private (Admin)
 */
export const getAdminTickets = async (req, res) => {
  try {
    const { status, priority, issueType, search, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }

    if (priority && priority !== "all") {
      filter.priority = priority.toLowerCase();
    }

    if (issueType && issueType !== "all") {
      filter.issueType = issueType.toLowerCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      const userMatches = await User.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }).select("_id");
      const matchedUserIds = userMatches.map((u) => u._id);

      const orConditions = [
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
        { ticketId: { $regex: q, $options: "i" } },
      ];

      if (matchedUserIds.length > 0) {
        orConditions.push({ user: { $in: matchedUserIds } });
      }

      if (mongoose.Types.ObjectId.isValid(q)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(q) });
        orConditions.push({ order: new mongoose.Types.ObjectId(q) });
      }

      filter.$or = orConditions;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate("user", "name email phone")
        .populate("category", "name icon")
        .populate("order", "_id orderStatus totalAmount createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      tickets,
    });
  } catch (error) {
    console.error("getAdminTickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin support tickets",
    });
  }
};

/**
 * @desc    Get single support ticket for admin
 * @route   GET /api/support/admin/tickets/:ticketId
 * @access  Private (Admin)
 */
export const getAdminTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await SupportTicket.findById(ticketId)
        .populate("user", "name email phone")
        .populate("category", "name icon description")
        .populate("order", "_id orderStatus totalAmount createdAt orderItems")
        .lean();
    } else {
      ticket = await SupportTicket.findOne({ ticketId })
        .populate("user", "name email phone")
        .populate("category", "name icon description")
        .populate("order", "_id orderStatus totalAmount createdAt orderItems")
        .lean();
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("getAdminTicketById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve support ticket",
    });
  }
};

/**
 * @desc    Update ticket status by admin
 * @route   PATCH /api/support/admin/tickets/:ticketId/status
 * @access  Private (Admin)
 */
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const normalizedStatus = status.toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    ticket.status = normalizedStatus;
    if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
      ticket.resolvedAt = new Date();
    } else {
      ticket.resolvedAt = null;
    }

    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate("user", "name email phone")
      .populate("category", "name icon")
      .populate("order", "_id orderStatus totalAmount createdAt")
      .lean();

    try {
      emitSupportTicketUpdate("status_updated", populated);
    } catch (socketErr) {
      // Non-fatal
    }

    // Step 11: Notify customer of status change
    const recipientUserId = ticket.user?._id || ticket.user;
    if (recipientUserId) {
      try {
        let notifTitle = "Support request updated";
        let notifBody = `Your support request status is now ${normalizedStatus.replace("_", " ")}.`;

        if (normalizedStatus === "in_progress") {
          notifBody = "Your support request status is now In Progress.";
        } else if (normalizedStatus === "resolved") {
          notifTitle = "Support request resolved";
          notifBody = "Your support request has been resolved.";
        } else if (normalizedStatus === "closed") {
          notifTitle = "Support request closed";
          notifBody = "Your support request has been closed.";
        }

        await sendNotification({
          userId: recipientUserId,
          title: notifTitle,
          body: notifBody,
          type: "SUPPORT",
          url: `/support/tickets/${ticket._id}`,
          orderId: ticket.order?._id || ticket.order || null,
        });
      } catch (notifErr) {
        console.error("Failed to notify customer of ticket status change:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${normalizedStatus}`,
      ticket: populated,
    });
  } catch (error) {
    console.error("updateTicketStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket status",
    });
  }
};

/**
 * @desc    Update ticket priority by admin
 * @route   PATCH /api/support/admin/tickets/:ticketId/priority
 * @access  Private (Admin)
 */
export const updateTicketPriority = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priority } = req.body;

    if (!priority) {
      return res.status(400).json({
        success: false,
        message: "Priority is required",
      });
    }

    const normalizedPriority = priority.toLowerCase();
    if (!VALID_PRIORITIES.includes(normalizedPriority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(", ")}`,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    ticket.priority = normalizedPriority;
    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate("user", "name email phone")
      .populate("category", "name icon")
      .populate("order", "_id orderStatus totalAmount createdAt")
      .lean();

    try {
      emitSupportTicketUpdate("priority_updated", populated);
    } catch (socketErr) {
      // Non-fatal
    }

    return res.status(200).json({
      success: true,
      message: `Ticket priority updated to ${normalizedPriority}`,
      ticket: populated,
    });
  } catch (error) {
    console.error("updateTicketPriority error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket priority",
    });
  }
};

/**
 * @desc    Submit admin response to support ticket
 * @route   PATCH /api/support/admin/tickets/:ticketId/respond
 * @access  Private (Admin)
 */
export const respondToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const responseText = (req.body.adminResponse || req.body.response || "").trim();
    const { status } = req.body;

    if (!responseText) {
      return res.status(400).json({
        success: false,
        message: "Response message cannot be empty",
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    ticket.adminResponse = responseText;

    if (status) {
      const normalizedStatus = status.toLowerCase();
      if (VALID_STATUSES.includes(normalizedStatus)) {
        ticket.status = normalizedStatus;
        if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
          ticket.resolvedAt = new Date();
        }
      }
    } else if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate("user", "name email phone")
      .populate("category", "name icon")
      .populate("order", "_id orderStatus totalAmount createdAt")
      .lean();

    try {
      emitSupportTicketUpdate("responded", populated);
    } catch (socketErr) {
      // Non-fatal
    }

    // Step 11: Notify customer of admin response
    const recipientUserId = ticket.user?._id || ticket.user;
    if (recipientUserId) {
      try {
        let notifTitle = "Support replied to your request";
        let notifBody = "Support team replied to your support request.";

        if (ticket.status === "resolved") {
          notifTitle = "Support request resolved";
          notifBody = "Your support request has been resolved.";
        }

        await sendNotification({
          userId: recipientUserId,
          title: notifTitle,
          body: notifBody,
          type: "SUPPORT",
          url: `/support/tickets/${ticket._id}`,
          orderId: ticket.order?._id || ticket.order || null,
        });
      } catch (notifErr) {
        console.error("Failed to notify customer of admin response:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Admin response saved successfully",
      ticket: populated,
    });
  } catch (error) {
    console.error("respondToTicket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save response",
    });
  }
};

/**
 * @desc    Get aggregate ticket statistics for admin dashboard
 * @route   GET /api/support/admin/tickets/stats
 * @access  Private (Admin)
 */
export const getAdminTicketStats = async (req, res) => {
  try {
    const [total, open, inProgress, resolved, closed, highPriority] =
      await Promise.all([
        SupportTicket.countDocuments({}),
        SupportTicket.countDocuments({ status: "open" }),
        SupportTicket.countDocuments({ status: "in_progress" }),
        SupportTicket.countDocuments({ status: "resolved" }),
        SupportTicket.countDocuments({ status: "closed" }),
        SupportTicket.countDocuments({ priority: "high" }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        open,
        in_progress: inProgress,
        resolved,
        closed,
        high_priority: highPriority,
      },
    });
  } catch (error) {
    console.error("getAdminTicketStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket statistics",
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        high_priority: 0,
      },
    });
  }
};

