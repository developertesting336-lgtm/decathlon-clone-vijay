import { getRecommendationsForUser } from "../services/recommendationService.js";
import { getVerifiedUserFromRequest } from "../middleware/authMiddleware.js";

/**
 * Get personalized product recommendations for the current user or guest
 * GET /api/recommendations/for-you
 * Query: limit, guestProductIds (comma-separated string)
 */
export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const verifiedUser = getVerifiedUserFromRequest(req);
    const userId = verifiedUser?._id || verifiedUser?.id || null;

    const limit = Math.min(Number(req.query.limit) || 12, 30);

    let guestProductIds = [];
    if (req.query.guestProductIds) {
      if (Array.isArray(req.query.guestProductIds)) {
        guestProductIds = req.query.guestProductIds;
      } else if (typeof req.query.guestProductIds === "string") {
        guestProductIds = req.query.guestProductIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const result = await getRecommendationsForUser(userId, {
      limit,
      guestProductIds,
    });

    res.status(200).json({
      success: true,
      count: result.products.length,
      primaryCategory: result.primaryCategory,
      reason: result.reason,
      hasPersonalization: result.hasPersonalization,
      products: result.products,
    });
  } catch (error) {
    console.error("Error in getPersonalizedRecommendations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate personalized recommendations",
    });
  }
};
