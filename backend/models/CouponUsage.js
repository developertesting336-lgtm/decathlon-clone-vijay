import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: [true, "Coupon ID is required"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
      index: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Efficient indexes for query performance & history (Step 9.1)
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ userId: 1, usedAt: -1 });
couponUsageSchema.index({ couponId: 1, usedAt: -1 });
// Unique constraint on orderId + couponId to avoid duplicate usage records per order
couponUsageSchema.index({ couponId: 1, orderId: 1 }, { unique: true });

const CouponUsage = mongoose.models.CouponUsage || mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;
