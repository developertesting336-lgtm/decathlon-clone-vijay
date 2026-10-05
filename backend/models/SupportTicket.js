import mongoose from "mongoose";
import "./User.js";
import "./Order.js";
import "./SupportCategory.js";

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.guestEmail;
      },
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportCategory",
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    issueType: {
      type: String,
      enum: [
        "order",
        "payment",
        "delivery",
        "return",
        "exchange",
        "refund",
        "product",
        "account",
        "other",
      ],
      default: "other",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    adminResponse: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Ticket identifier code for easy reference (e.g., TIC-123456)
    ticketId: {
      type: String,
      sparse: true,
      index: true,
    },
    // Optional guest details for AI assistant support requests
    guestName: {
      type: String,
      default: "",
    },
    guestEmail: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to normalize enums and generate unique reference ticketId
supportTicketSchema.pre("validate", function () {
  if (this.status && typeof this.status === "string") {
    this.status = this.status.toLowerCase();
  }
  if (this.priority && typeof this.priority === "string") {
    this.priority = this.priority.toLowerCase();
  }
  if (this.issueType && typeof this.issueType === "string") {
    this.issueType = this.issueType.toLowerCase();
  }
  if (!this.ticketId) {
    this.ticketId = `TIC-${Math.floor(100000 + Math.random() * 900000)}`;
  }
});

// Indexes for fast lookup
supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
