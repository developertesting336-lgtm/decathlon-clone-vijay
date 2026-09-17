import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    products: {
      type: Array,
      default: [],
    },
    orders: {
      type: Array,
      default: [],
    },
    ticket: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    type: {
      type: String,
      default: "general",
    },
    suggestions: {
      type: [String],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiChatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    messages: [chatMessageSchema],
  },
  {
    timestamps: true,
  }
);

const AiChatHistory = mongoose.model("AiChatHistory", aiChatHistorySchema);

export default AiChatHistory;
