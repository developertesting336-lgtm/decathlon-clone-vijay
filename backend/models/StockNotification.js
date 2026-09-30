import mongoose from "mongoose";

const stockNotificationSchema = new mongoose.Schema(
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
    notified: {
      type: Boolean,
      default: false,
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
stockNotificationSchema.index({ user: 1, product: 1 }, { unique: true, sparse: true });
stockNotificationSchema.index({ email: 1, product: 1 });
stockNotificationSchema.index({ product: 1, notified: 1 });

const StockNotification = mongoose.model("StockNotification", stockNotificationSchema);

export default StockNotification;
