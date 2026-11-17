import RecentlyViewed from "../models/RecentlyViewed.js";
import Product from "../models/Product.js";

/**
 * Record a product view for the authenticated user
 * POST /api/recently-viewed
 * Body: { productId }
 */
export const recordProductView = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Product.findById(productId).select("price discountPrice");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentPrice =
      product.discountPrice !== undefined &&
      product.discountPrice !== null &&
      Number(product.discountPrice) > 0
        ? Number(product.discountPrice)
        : Number(product.price) || 0;

    const record = await RecentlyViewed.recordView(userId, productId, currentPrice);

    res.status(200).json({
      success: true,
      message: "Product view recorded",
      data: record,
    });
  } catch (error) {
    console.error("Error in recordProductView:", error);
    res.status(500).json({ message: error.message || "Failed to record product view" });
  }
};

/**
 * Get recently viewed products for the authenticated user
 * GET /api/recently-viewed
 * Query: limit (default: 20)
 */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const views = await RecentlyViewed.find({ user: userId })
      .sort({ lastViewedAt: -1 })
      .limit(limit)
      .populate({
        path: "product",
        select: "name price discountPrice images brand rating stock category countInStock",
      })
      .lean();

    // Filter out any entries where the referenced product no longer exists
    const validItems = views
      .filter((item) => item.product != null)
      .map((item) => {
        const prod = item.product;
        const currentEffectivePrice =
          prod.discountPrice !== undefined &&
          prod.discountPrice !== null &&
          Number(prod.discountPrice) > 0
            ? Number(prod.discountPrice)
            : Number(prod.price) || 0;

        const hasPriceDropped =
          item.viewedPrice && currentEffectivePrice < item.viewedPrice;
        const discountAmount = hasPriceDropped
          ? Math.max(0, item.viewedPrice - currentEffectivePrice)
          : 0;

        return {
          _id: item._id,
          product: prod,
          viewedPrice: item.viewedPrice,
          currentPrice: currentEffectivePrice,
          hasPriceDropped,
          discountAmount,
          lastViewedAt: item.lastViewedAt,
        };
      });

    res.status(200).json({
      success: true,
      count: validItems.length,
      items: validItems,
    });
  } catch (error) {
    console.error("Error in getRecentlyViewed:", error);
    res.status(500).json({ message: error.message || "Failed to get recently viewed products" });
  }
};

/**
 * Remove a specific product or clear all recently viewed products
 * DELETE /api/recently-viewed or DELETE /api/recently-viewed/:productId
 */
export const clearRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { productId } = req.params;

    if (productId) {
      await RecentlyViewed.findOneAndDelete({ user: userId, product: productId });
      return res.status(200).json({
        success: true,
        message: "Product removed from recently viewed",
      });
    }

    await RecentlyViewed.deleteMany({ user: userId });
    res.status(200).json({
      success: true,
      message: "Recently viewed history cleared",
    });
  } catch (error) {
    console.error("Error in clearRecentlyViewed:", error);
    res.status(500).json({ message: error.message || "Failed to clear recently viewed" });
  }
};
