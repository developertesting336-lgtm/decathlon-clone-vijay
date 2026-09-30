import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

/**
 * Safely compute and update averageRating & reviewCount on the Product model.
 * @param {string|mongoose.Types.ObjectId} productId
 * @returns {Promise<{ averageRating: number, reviewCount: number }>}
 */
export const updateProductRatingSummary = async (productId) => {
  const prodId = new mongoose.Types.ObjectId(productId);
  const stats = await Review.aggregate([
    { $match: { product: prodId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating =
    stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0;
  const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;

  await Product.findByIdAndUpdate(prodId, {
    averageRating,
    reviewCount,
    review: averageRating, // Sync legacy review field for full backward compatibility
  });

  return { averageRating, reviewCount };
};

/**
 * CREATE REVIEW
 * POST /reviews or /api/reviews
 * Requires: Logged in user
 */
export const createReview = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to submit a review",
      });
    }

    const { productId: bodyProdId, product: bodyAltProdId, rating, comment, title } = req.body;
    const productId = bodyProdId || bodyAltProdId;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }

    const trimmedComment = String(comment || "").trim();
    if (!trimmedComment) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    // Check for existing review by this user on this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product. Please update your existing review.",
      });
    }

    // Check if user has purchased the item
    let isVerifiedPurchase = false;
    try {
      const orderMatch = await Order.exists({
        user: userId,
        "items.product": productId,
      });
      if (orderMatch) isVerifiedPurchase = true;
    } catch (orderErr) {
      // Non-critical check
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating: parsedRating,
      comment: trimmedComment,
      title: String(title || "").trim(),
      isVerifiedPurchase,
    });

    // Update Product averageRating and reviewCount
    const ratingSummary = await updateProductRatingSummary(productId);

    await review.populate("user", "name avatar");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    });
  } catch (error) {
    console.error("Create Review Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};

/**
 * GET REVIEWS FOR PRODUCT
 * GET /reviews/product/:productId or /api/reviews/product/:productId
 */
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId).select("name averageRating reviewCount review");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ product: productId }),
    ]);

    const averageRating = product.averageRating !== undefined ? product.averageRating : (product.review || 0);
    const reviewCount = product.reviewCount !== undefined ? product.reviewCount : total;

    return res.status(200).json({
      success: true,
      productId,
      averageRating,
      reviewCount,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      reviews,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

/**
 * GET SINGLE REVIEW BY ID
 * GET /reviews/:reviewId or /api/reviews/:reviewId
 */
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(reviewId)
      .populate("user", "name avatar")
      .populate("product", "name images price");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("Get Review By Id Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review",
    });
  }
};

/**
 * UPDATE REVIEW
 * PUT /reviews/:reviewId or /api/reviews/:reviewId
 * Requires: Logged in owner or admin
 */
export const updateReview = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const { reviewId } = req.params;

    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === userId?.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this review",
      });
    }

    const { rating, comment, title } = req.body;

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = parsedRating;
    }

    if (comment !== undefined) {
      const trimmedComment = String(comment).trim();
      if (!trimmedComment) {
        return res.status(400).json({
          success: false,
          message: "Review comment cannot be empty",
        });
      }
      review.comment = trimmedComment;
    }

    if (title !== undefined) {
      review.title = String(title).trim();
    }

    await review.save();

    const ratingSummary = await updateProductRatingSummary(review.product);
    await review.populate("user", "name avatar");

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    });
  } catch (error) {
    console.error("Update Review Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update review",
    });
  }
};

/**
 * DELETE REVIEW
 * DELETE /reviews/:reviewId or /api/reviews/:reviewId
 * Requires: Logged in owner or admin
 */
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const { reviewId } = req.params;

    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === userId?.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review",
      });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    const ratingSummary = await updateProductRatingSummary(productId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    });
  } catch (error) {
    console.error("Delete Review Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};

/**
 * ADMIN: GET ALL REVIEWS
 * GET /reviews or /api/reviews
 * Requires: Admin
 */
export const getAllReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.productId && mongoose.Types.ObjectId.isValid(req.query.productId)) {
      filter.product = req.query.productId;
    }
    if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      filter.user = req.query.userId;
    }
    if (req.query.rating) {
      filter.rating = Number(req.query.rating);
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email avatar")
        .populate("product", "name images price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      reviews,
    });
  } catch (error) {
    console.error("Admin Get All Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};
