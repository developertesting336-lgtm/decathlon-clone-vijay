import mongoose from "mongoose";

const recentlyViewedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    viewedPrice: {
      type: Number,
      required: true,
    },
    lastNotifiedPrice: {
      type: Number,
      default: null,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal performance
recentlyViewedSchema.index({ user: 1, product: 1 }, { unique: true });
recentlyViewedSchema.index({ product: 1, lastViewedAt: -1 });
recentlyViewedSchema.index({ user: 1, lastViewedAt: -1 });

/**
 * Helper to record or update a product view for a user.
 */
recentlyViewedSchema.statics.recordView = async function (userId, productId, viewedPrice) {
  if (!userId || !productId) return null;
  return this.findOneAndUpdate(
    { user: userId, product: productId },
    {
      $set: {
        viewedPrice: Number(viewedPrice) || 0,
        lastViewedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const RecentlyViewed = mongoose.model("RecentlyViewed", recentlyViewedSchema);

export default RecentlyViewed;
