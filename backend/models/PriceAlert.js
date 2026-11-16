import mongoose from "mongoose";

const priceAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    initialPrice: {
      type: Number,
      required: true,
    },
    targetPrice: {
      type: Number,
      default: null,
    },
    lastNotifiedPrice: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
priceAlertSchema.index({ user: 1, product: 1 }, { unique: true, sparse: true });
priceAlertSchema.index({ email: 1, product: 1 });
priceAlertSchema.index({ product: 1, isActive: 1 });

const PriceAlert = mongoose.model("PriceAlert", priceAlertSchema);

export default PriceAlert;
