import mongoose from "mongoose";

const supportFAQSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportCategory",
      required: [true, "Category reference is required"],
    },
    question: {
      type: String,
      required: [true, "FAQ question is required"],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, "FAQ answer is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying, filtering and sorting
supportFAQSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
supportFAQSchema.index({ isActive: 1 });
supportFAQSchema.index({ question: "text", answer: "text" });

const SupportFAQ = mongoose.model("SupportFAQ", supportFAQSchema);

export default SupportFAQ;
