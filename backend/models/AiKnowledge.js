import mongoose from "mongoose";

/**
 * AI Knowledge Base Schema
 * Stores verified Q&A knowledge topics for the Decathlon AI Chatbot.
 */
const aiKnowledgeSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        // Customer Support & Orders
        "orders",
        "cancellation",
        "returns",
        "refund",
        "payment",
        "delivery",
        "shipping",

        // Account & Shopping
        "account",
        "products",
        "cart",
        "wishlist",
        "coupons",
        "offers",

        // Sports, Gear & Sizing
        "sports_advice",
        "sizing",
        "warranty",

        // Store Services & General
        "store",
        "pickup",
        "technical_support",
        "membership",
        "general",
      ],
      default: "general",
    },
    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    answer: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search and lookup indexes
aiKnowledgeSchema.index({ keywords: 1 });
aiKnowledgeSchema.index({ topic: "text", answer: "text", keywords: "text" });
aiKnowledgeSchema.index({ category: 1, isActive: 1 });

const AiKnowledge = mongoose.model("AiKnowledge", aiKnowledgeSchema);

export default AiKnowledge;
