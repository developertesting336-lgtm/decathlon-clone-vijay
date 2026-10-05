import mongoose from "mongoose";

const supportCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    icon: {
      type: String,
      default: "orders",
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

// Indexes for fast lookup and ordering
supportCategorySchema.index({ isActive: 1, displayOrder: 1 });
supportCategorySchema.index({ displayOrder: 1, createdAt: 1 });

const SupportCategory = mongoose.model("SupportCategory", supportCategorySchema);

export default SupportCategory;
