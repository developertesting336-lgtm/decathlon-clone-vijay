import Product from "../models/Product.js";
import RecentlyViewed from "../models/RecentlyViewed.js";
import Wishlist from "../models/Wishlist.js";
import Order from "../models/Order.js";

/**
 * Build personalized product recommendations for a user (or guest session).
 *
 * @param {string|null} userId - User ObjectId string if logged in
 * @param {Object} [options]
 * @param {number} [options.limit=12] - Number of recommendations to return
 * @param {Array<string>} [options.guestProductIds=[]] - Product IDs viewed by guest
 * @returns {Promise<{ products: Array, primaryCategory: string, reason: string }>}
 */
export const getRecommendationsForUser = async (userId, options = {}) => {
  try {
    const limit = Math.min(Number(options.limit) || 12, 30);
    const guestProductIds = Array.isArray(options.guestProductIds)
      ? options.guestProductIds.filter(Boolean)
      : [];

    let interactedProductIds = new Set(guestProductIds.map(String));
    let purchasedProductIds = new Set();
    const categoryScores = new Map();
    const subcategoryScores = new Map();
    const brandScores = new Map();
    let priceSamples = [];

    // 1. Collect signals for authenticated user
    if (userId) {
      const [recentViews, wishlist, pastOrders] = await Promise.all([
        RecentlyViewed.find({ user: userId })
          .sort({ lastViewedAt: -1 })
          .limit(20)
          .populate("product")
          .lean(),
        Wishlist.findOne({ user: userId })
          .populate("products")
          .lean(),
        Order.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("orderItems")
          .lean(),
      ]);

      // Process Recently Viewed (Recency weight: 3x)
      if (Array.isArray(recentViews)) {
        recentViews.forEach((rv) => {
          const prod = rv.product;
          if (!prod) return;
          interactedProductIds.add(prod._id.toString());
          const effPrice = prod.discountPrice || prod.price;
          if (effPrice) priceSamples.push(effPrice);

          // Category
          const catId = prod.category?._id?.toString() || prod.category?.toString();
          if (catId) categoryScores.set(catId, (categoryScores.get(catId) || 0) + 3);

          // Subcategory
          if (prod.subcategory) {
            const sub = prod.subcategory.trim();
            subcategoryScores.set(sub, (subcategoryScores.get(sub) || 0) + 3);
          }

          // Brand
          if (prod.brand) {
            const b = prod.brand.trim().toUpperCase();
            brandScores.set(b, (brandScores.get(b) || 0) + 2);
          }
        });
      }

      // Process Wishlist (Intent weight: 4x)
      if (wishlist?.products && Array.isArray(wishlist.products)) {
        wishlist.products.forEach((prod) => {
          if (!prod || !prod._id) return;
          interactedProductIds.add(prod._id.toString());
          const effPrice = prod.discountPrice || prod.price;
          if (effPrice) priceSamples.push(effPrice);

          const catId = prod.category?._id?.toString() || prod.category?.toString();
          if (catId) categoryScores.set(catId, (categoryScores.get(catId) || 0) + 4);

          if (prod.subcategory) {
            const sub = prod.subcategory.trim();
            subcategoryScores.set(sub, (subcategoryScores.get(sub) || 0) + 4);
          }

          if (prod.brand) {
            const b = prod.brand.trim().toUpperCase();
            brandScores.set(b, (brandScores.get(b) || 0) + 3);
          }
        });
      }

      // Process Past Orders (Exclude already bought, add brand/category affinity)
      if (Array.isArray(pastOrders)) {
        pastOrders.forEach((ord) => {
          ord.orderItems?.forEach((item) => {
            const pid = item.product?._id?.toString() || item.product?.toString();
            if (pid) purchasedProductIds.add(pid);
          });
        });
      }
    }

    // 2. Process guest product IDs if present
    if (guestProductIds.length > 0) {
      const guestProducts = await Product.find({
        _id: { $in: guestProductIds },
      }).lean();

      guestProducts.forEach((prod) => {
        const effPrice = prod.discountPrice || prod.price;
        if (effPrice) priceSamples.push(effPrice);

        const catId = prod.category?._id?.toString() || prod.category?.toString();
        if (catId) categoryScores.set(catId, (categoryScores.get(catId) || 0) + 3);

        if (prod.subcategory) {
          const sub = prod.subcategory.trim();
          subcategoryScores.set(sub, (subcategoryScores.get(sub) || 0) + 3);
        }

        if (prod.brand) {
          const b = prod.brand.trim().toUpperCase();
          brandScores.set(b, (brandScores.get(b) || 0) + 2);
        }
      });
    }

    // Determine Top Affinities
    let topCategoryId = null;
    let topCategoryScore = 0;
    categoryScores.forEach((score, catId) => {
      if (score > topCategoryScore) {
        topCategoryScore = score;
        topCategoryId = catId;
      }
    });

    let topSubcategory = null;
    let topSubScore = 0;
    subcategoryScores.forEach((score, sub) => {
      if (score > topSubScore) {
        topSubScore = score;
        topSubcategory = sub;
      }
    });

    let topBrand = null;
    let topBrandScore = 0;
    brandScores.forEach((score, b) => {
      if (score > topBrandScore) {
        topBrandScore = score;
        topBrand = b;
      }
    });

    const avgPrice =
      priceSamples.length > 0
        ? priceSamples.reduce((a, b) => a + b, 0) / priceSamples.length
        : null;

    // 3. Fetch candidate products from catalog prioritizing user affinities
    const affinityFilters = [];
    if (topSubcategory) {
      affinityFilters.push({ subcategory: topSubcategory });
    }
    if (topCategoryId) {
      affinityFilters.push({ category: topCategoryId });
    }
    for (const [sub] of subcategoryScores.entries()) {
      if (sub && sub !== topSubcategory) {
        affinityFilters.push({ subcategory: sub });
      }
    }
    for (const [cat] of categoryScores.entries()) {
      if (cat && cat !== topCategoryId) {
        affinityFilters.push({ category: cat });
      }
    }

    let candidates = [];
    if (affinityFilters.length > 0) {
      candidates = await Product.find({
        isActive: { $ne: false },
        stock: { $gt: 0 },
        $or: affinityFilters,
      })
        .populate("category", "name")
        .limit(60)
        .lean();
    }

    // Backfill with top-rated and trending products if affinity pool is small or empty
    if (candidates.length < Math.max(limit + 5, 20)) {
      const fallback = await Product.find({ isActive: { $ne: false }, stock: { $gt: 0 } })
        .populate("category", "name")
        .sort({ rating: -1, createdAt: -1 })
        .limit(40)
        .lean();
      candidates = [...candidates, ...fallback];
    }

    // 4. Score and Rank Candidates
    const scored = candidates
      .filter((p) => !purchasedProductIds.has(p._id.toString()))
      .map((p) => {
        let score = 0;
        const pid = p._id.toString();
        const pCatId = p.category?._id?.toString() || p.category?.toString();
        const pSub = p.subcategory?.trim();
        const pBrand = p.brand?.trim()?.toUpperCase();
        const pPrice = p.discountPrice || p.price || 0;

        // Primary affinity boosts (Guarantees matched category products lead the section)
        if (pSub && topSubcategory && pSub === topSubcategory) {
          score += 300;
        } else if (pSub && subcategoryScores.has(pSub)) {
          score += subcategoryScores.get(pSub) * 15;
        }

        if (pCatId && topCategoryId && pCatId === topCategoryId) {
          score += 250;
        } else if (pCatId && categoryScores.has(pCatId)) {
          score += categoryScores.get(pCatId) * 12;
        }

        if (pBrand && brandScores.has(pBrand)) {
          score += brandScores.get(pBrand) * 8;
        }

        // Price range match (+-40% of customer average)
        if (avgPrice && pPrice > 0) {
          const ratio = pPrice / avgPrice;
          if (ratio >= 0.6 && ratio <= 1.4) {
            score += 15;
          }
        }

        // Quality & Promotion boosts
        if (p.rating >= 4.5) score += 20;
        else if (p.rating >= 4.0) score += 10;

        if (p.discountPrice && p.discountPrice < p.price) {
          score += 25; // on sale boost
        }

        if (p.onSale) score += 15;

        // Rotation & discovery: penalty if already viewed so unviewed products rotate to front
        if (interactedProductIds.has(pid)) {
          score -= 25;
        }

        // Freshness jitter: dynamic variation so recommendations rotate fresh picks on reloads
        score += Math.random() * 20;

        return { product: p, score };
      });

    // Sort by highest score first, deduplicate by ID
    scored.sort((a, b) => b.score - a.score);

    const seenIds = new Set();
    const topProducts = [];
    for (const item of scored) {
      const id = item.product._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        topProducts.push(item.product);
      }
      if (topProducts.length >= limit) break;
    }

    // Determine contextual headline/reason
    let primaryCategoryName = "";
    if (topProducts.length > 0) {
      primaryCategoryName = topProducts[0]?.category?.name || "";
    }
    if (!primaryCategoryName && topCategoryId && topProducts.length > 0) {
      const matched = topProducts.find(
        (p) => (p.category?._id?.toString() || p.category?.toString()) === topCategoryId
      );
      primaryCategoryName = matched?.category?.name || "";
    }

    let reason = "Curated based on trending athletic gear and top customer favorites";
    if (topSubcategory) {
      reason = `Recommended based on your interest in ${topSubcategory}`;
    } else if (primaryCategoryName) {
      reason = `Top picks in ${primaryCategoryName} matching your activity`;
    } else if (topBrand) {
      reason = `Popular gear from ${topBrand} curated for you`;
    }

    return {
      products: topProducts,
      primaryCategory: primaryCategoryName || topSubcategory || "All Sports",
      reason,
      hasPersonalization: categoryScores.size > 0 || brandScores.size > 0,
    };
  } catch (error) {
    console.error("getRecommendationsForUser Error:", error);
    // Graceful fallback to trending active products
    const fallbackProducts = await Product.find({ isActive: { $ne: false }, stock: { $gt: 0 } })
      .populate("category", "name")
      .sort({ rating: -1, createdAt: -1 })
      .limit(12)
      .lean();

    return {
      products: fallbackProducts,
      primaryCategory: "All Sports",
      reason: "Popular top-rated gear loved by athletes",
      hasPersonalization: false,
    };
  }
};
