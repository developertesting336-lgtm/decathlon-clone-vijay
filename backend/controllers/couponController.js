import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import CouponUsage from "../models/CouponUsage.js";
import User, { calculateUserInactivityDays } from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cart from "../models/cart.js";

const ALLOWED_DISTRIBUTION_TYPES = [
  "global",
  "new_user",
  "inactive_user",
  "selected_users",
  "user_group",
  "category_based",
  "product_based",
];

export const ALLOWED_USER_GROUPS = [
  "all_users",
  "new_users",
  "returning_users",
  "frequent_buyers",
  "high_value_customers",
  "inactive_customers",
  "custom",
];

const sanitizeDistributionFields = ({
  distributionType,
  assignedUsers,
  eligibilityRules,
  inactiveDays,
  newUserDays,
  categories,
  products,
  perUserLimit,
  priority,
  eligibilityDuration,
  isUpdate = false,
  currentCoupon = {},
}) => {
  const result = {};

  // 1. distributionType
  if (distributionType !== undefined || !isUpdate) {
    const rawType =
      distributionType !== undefined
        ? distributionType
        : currentCoupon.distributionType || "global";
    const cleanType = String(rawType || "global").trim().toLowerCase();
    if (!ALLOWED_DISTRIBUTION_TYPES.includes(cleanType)) {
      return {
        error: `Invalid distribution type: "${rawType}". Allowed types: ${ALLOWED_DISTRIBUTION_TYPES.join(
          ", "
        )}`,
      };
    }
    result.distributionType = cleanType;
  }
  const effectiveType =
    result.distributionType || currentCoupon.distributionType || "global";

  // 2. perUserLimit
  if (perUserLimit !== undefined || !isUpdate) {
    const val =
      perUserLimit !== undefined
        ? Number(perUserLimit)
        : currentCoupon.perUserLimit || 1;
    if (isNaN(val) || val < 1) {
      return { error: "Per-user limit must be at least 1" };
    }
    result.perUserLimit = val;
  }

  // 3. inactiveDays
  if (inactiveDays !== undefined || !isUpdate) {
    const val =
      inactiveDays !== undefined
        ? Number(inactiveDays)
        : currentCoupon.inactiveDays || 0;
    if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
      return { error: "Inactive days must be a positive integer" };
    }
    if (effectiveType === "inactive_user" && val <= 0) {
      return {
        error:
          "Inactive days must be greater than 0 for inactive_user coupons",
      };
    }
    result.inactiveDays = val;
  }

  // 4. newUserDays
  if (newUserDays !== undefined || !isUpdate) {
    const val =
      newUserDays !== undefined
        ? Number(newUserDays)
        : currentCoupon.newUserDays || 0;
    if (isNaN(val) || val < 0) {
      return { error: "New user days cannot be negative" };
    }
    if (effectiveType === "new_user" && val <= 0) {
      return {
        error: "New user days must be greater than 0 for new_user coupons",
      };
    }
    result.newUserDays = val;
  }

  // 5. assignedUsers
  if (assignedUsers !== undefined || !isUpdate) {
    const raw =
      assignedUsers !== undefined
        ? assignedUsers
        : currentCoupon.assignedUsers || [];
    const cleanUsers = [];
    const seen = new Set();
    if (Array.isArray(raw)) {
      for (const u of raw) {
        if (!u) continue;
        const uId = u._id ? u._id.toString() : u.toString().trim();
        if (!mongoose.Types.ObjectId.isValid(uId)) {
          return { error: `Invalid user ID in assignedUsers: "${uId}"` };
        }
        if (!seen.has(uId)) {
          seen.add(uId);
          cleanUsers.push(uId);
        }
      }
    }
    if (effectiveType === "selected_users" && cleanUsers.length === 0) {
      return {
        error:
          "At least one valid user must be assigned for selected_users coupons",
      };
    }
    result.assignedUsers = cleanUsers;
  } else if (effectiveType === "selected_users") {
    const existing = currentCoupon.assignedUsers || [];
    if (!Array.isArray(existing) || existing.length === 0) {
      return {
        error:
          "At least one valid user must be assigned for selected_users coupons",
      };
    }
  }

  // 6. categories
  if (categories !== undefined || !isUpdate) {
    const raw =
      categories !== undefined
        ? categories
        : currentCoupon.categories || [];
    const cleanCats = [];
    const seen = new Set();
    if (Array.isArray(raw)) {
      for (const c of raw) {
        if (!c) continue;
        const cId = c._id ? c._id.toString() : c.toString().trim();
        if (mongoose.Types.ObjectId.isValid(cId) && !seen.has(cId)) {
          seen.add(cId);
          cleanCats.push(cId);
        }
      }
    }
    if (effectiveType === "category_based" && cleanCats.length === 0) {
      return {
        error:
          "At least one category is required for category_based coupons",
      };
    }
    result.categories = cleanCats;
  }

  // 7. products
  if (products !== undefined || !isUpdate) {
    const raw =
      products !== undefined ? products : currentCoupon.products || [];
    const cleanProds = [];
    const seen = new Set();
    if (Array.isArray(raw)) {
      for (const p of raw) {
        if (!p) continue;
        const pId = p._id ? p._id.toString() : p.toString().trim();
        if (mongoose.Types.ObjectId.isValid(pId) && !seen.has(pId)) {
          seen.add(pId);
          cleanProds.push(pId);
        }
      }
    }
    if (effectiveType === "product_based" && cleanProds.length === 0) {
      return {
        error:
          "At least one product is required for product_based coupons",
      };
    }
    result.products = cleanProds;
  }

  // 8. eligibilityRules
  if (
    eligibilityRules !== undefined ||
    !isUpdate ||
    effectiveType === "user_group"
  ) {
    const raw =
      eligibilityRules !== undefined
        ? eligibilityRules
        : currentCoupon.eligibilityRules || { userGroup: "", group: "" };
    const cleanRules = {
      group: "",
      userGroup: "",
      minimumOrders: 0,
      minimumSpend: 0,
    };
    if (raw && typeof raw === "object") {
      const rawGroup = raw.userGroup || raw.group;
      cleanRules.userGroup = rawGroup
        ? String(rawGroup).trim().toLowerCase()
        : "";
      cleanRules.group = cleanRules.userGroup;
      if (
        raw.minimumOrders !== undefined &&
        raw.minimumOrders !== null &&
        raw.minimumOrders !== ""
      ) {
        cleanRules.minimumOrders = Number(raw.minimumOrders);
      }
      if (
        raw.minimumSpend !== undefined &&
        raw.minimumSpend !== null &&
        raw.minimumSpend !== ""
      ) {
        cleanRules.minimumSpend = Number(raw.minimumSpend);
      }
    }

    if (effectiveType === "user_group") {
      if (!cleanRules.userGroup || !ALLOWED_USER_GROUPS.includes(cleanRules.userGroup)) {
        return {
          error: `Invalid user group: "${cleanRules.userGroup}". Allowed groups: ${ALLOWED_USER_GROUPS.join(
            ", "
          )}`,
        };
      }

      if (cleanRules.userGroup === "frequent_buyers") {
        if (
          isNaN(cleanRules.minimumOrders) ||
          cleanRules.minimumOrders <= 0 ||
          !Number.isInteger(cleanRules.minimumOrders)
        ) {
          return {
            error:
              "Minimum orders must be a positive integer for frequent_buyers group",
          };
        }
      }

      if (cleanRules.userGroup === "high_value_customers") {
        if (isNaN(cleanRules.minimumSpend) || cleanRules.minimumSpend <= 0) {
          return {
            error:
              "Minimum spend must be greater than 0 for high_value_customers group",
          };
        }
      }
    }

    result.eligibilityRules = cleanRules;
  }

  // 9. priority (Step 13)
  if (priority !== undefined || !isUpdate) {
    const val =
      priority !== undefined
        ? Number(priority)
        : currentCoupon.priority !== undefined
        ? currentCoupon.priority
        : 0;
    if (isNaN(val) || val < 0) {
      return { error: "Priority cannot be negative" };
    }
    result.priority = Math.floor(val);
  }

  // 10. eligibilityDuration (Step 12)
  if (eligibilityDuration !== undefined || !isUpdate) {
    const val =
      eligibilityDuration !== undefined
        ? Number(eligibilityDuration)
        : currentCoupon.eligibilityDuration !== undefined
        ? currentCoupon.eligibilityDuration
        : 7;
    if (isNaN(val) || val < 0) {
      return { error: "Eligibility duration cannot be negative" };
    }
    result.eligibilityDuration = val;
  }

  return { data: result };
};

/*
========================================================
CUSTOMER ORDER STATS & ELIGIBILITY EVALUATION (STEP 6)
========================================================
*/
export const getCustomerOrderStats = async (userId) => {
  if (!userId) return { orderCount: 0, totalSpend: 0 };
  try {
    const stats = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId.toString()),
          orderStatus: { $nin: ["cancelled", "failed", "returned"] },
          paymentStatus: { $nin: ["failed", "refunded"] },
        },
      },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$totalAmount" },
        },
      },
    ]);

    if (stats.length > 0) {
      return {
        orderCount: stats[0].orderCount || 0,
        totalSpend: Math.round((stats[0].totalSpend || 0) * 100) / 100,
      };
    }
  } catch (err) {
    console.error("Error calculating customer order stats:", err);
  }
  return { orderCount: 0, totalSpend: 0 };
};

export const isUserEligibleForCoupon = async ({
  coupon,
  userId,
  userDoc = null,
  cachedStats = null,
  cartItems = null,
}) => {
  const distributionType = coupon.distributionType || "global";

  // 1. Global coupons are available to all authenticated customers
  if (distributionType === "global") {
    return { eligible: true };
  }

  // All non-global distribution types require an authenticated customer
  if (!userId) {
    return {
      eligible: false,
      reason: "You are not eligible to use this coupon",
    };
  }

  const userIdStr = userId.toString();

  // 2. Selected users
  if (distributionType === "selected_users") {
    if (!Array.isArray(coupon.assignedUsers) || coupon.assignedUsers.length === 0) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    const isAssigned = coupon.assignedUsers.some((u) => {
      const uStr = u?._id ? u._id.toString() : u?.toString();
      return uStr === userIdStr;
    });
    if (!isAssigned) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    return { eligible: true };
  }

  // 3. New user
  if (distributionType === "new_user") {
    const user = userDoc || (await User.findById(userId).select("createdAt"));
    if (!user) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    const userCreatedDate = user.createdAt || (user._id ? user._id.getTimestamp() : null);
    if (!userCreatedDate) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    const accountAgeInMs = Math.max(0, Date.now() - new Date(userCreatedDate).getTime());
    const accountAgeInDays = accountAgeInMs / (1000 * 60 * 60 * 24);
    const allowedDays = Number(coupon.newUserDays) || 0;
    if (accountAgeInDays > allowedDays) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    return { eligible: true };
  }

  // 4. Inactive user (Step 4 & Step 12)
  if (distributionType === "inactive_user") {
    const user =
      userDoc ||
      (await User.findById(userId).select("lastLoginAt previousLoginAt"));
    if (!user || !user.lastLoginAt) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    const inactivityDays = calculateUserInactivityDays(user);
    const requiredInactiveDays = Number(coupon.inactiveDays) || 0;
    if (inactivityDays < requiredInactiveDays) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }

    // Step 12: Eligibility duration after returning
    if (user.previousLoginAt && user.lastLoginAt) {
      const gapMs = new Date(user.lastLoginAt).getTime() - new Date(user.previousLoginAt).getTime();
      const gapDays = gapMs / (1000 * 60 * 60 * 24);
      if (gapDays >= requiredInactiveDays) {
        const daysSinceReturn = (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
        const allowedDuration = Number(coupon.eligibilityDuration) || 7;
        if (daysSinceReturn > allowedDuration) {
          return {
            eligible: false,
            reason: "You are not eligible to use this coupon",
          };
        }
      }
    }
    return { eligible: true };
  }

  // 5. User group (Step 6 & Step 12)
  if (distributionType === "user_group") {
    const rawGroup =
      coupon.eligibilityRules?.userGroup || coupon.eligibilityRules?.group;
    const cleanGroup = rawGroup ? String(rawGroup).trim().toLowerCase() : "";

    if (!cleanGroup || !ALLOWED_USER_GROUPS.includes(cleanGroup)) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }

    if (cleanGroup === "all_users") {
      return { eligible: true };
    }

    if (cleanGroup === "new_users") {
      const user = userDoc || (await User.findById(userId).select("createdAt"));
      if (!user) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const userCreatedDate = user.createdAt || (user._id ? user._id.getTimestamp() : null);
      if (!userCreatedDate) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const accountAgeInMs = Math.max(0, Date.now() - new Date(userCreatedDate).getTime());
      const accountAgeInDays = accountAgeInMs / (1000 * 60 * 60 * 24);
      const allowedDays = Number(coupon.newUserDays) || 7;
      if (accountAgeInDays > allowedDays) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      return { eligible: true };
    }

    if (cleanGroup === "returning_users" || cleanGroup === "inactive_customers") {
      const user =
        userDoc ||
        (await User.findById(userId).select("lastLoginAt previousLoginAt"));
      if (!user || !user.lastLoginAt) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const inactivityDays = calculateUserInactivityDays(user);
      const requiredInactiveDays = Number(coupon.inactiveDays) || 30;
      if (inactivityDays < requiredInactiveDays) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }

      if (user.previousLoginAt && user.lastLoginAt) {
        const gapMs = new Date(user.lastLoginAt).getTime() - new Date(user.previousLoginAt).getTime();
        const gapDays = gapMs / (1000 * 60 * 60 * 24);
        if (gapDays >= requiredInactiveDays) {
          const daysSinceReturn = (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
          const allowedDuration = Number(coupon.eligibilityDuration) || 7;
          if (daysSinceReturn > allowedDuration) {
            return {
              eligible: false,
              reason: "You are not eligible to use this coupon",
            };
          }
        }
      }
      return { eligible: true };
    }

    if (cleanGroup === "frequent_buyers") {
      const stats = cachedStats || (await getCustomerOrderStats(userId));
      const minOrders = Number(coupon.eligibilityRules?.minimumOrders) || 0;
      if (minOrders <= 0 || stats.orderCount < minOrders) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      return { eligible: true };
    }

    if (cleanGroup === "high_value_customers") {
      const stats = cachedStats || (await getCustomerOrderStats(userId));
      const minSpend = Number(coupon.eligibilityRules?.minimumSpend) || 0;
      if (minSpend <= 0 || stats.totalSpend < minSpend) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      return { eligible: true };
    }

    if (cleanGroup === "custom") {
      if (!Array.isArray(coupon.assignedUsers) || coupon.assignedUsers.length === 0) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const isAssigned = coupon.assignedUsers.some((u) => {
        const uStr = u?._id ? u._id.toString() : u?.toString();
        return uStr === userIdStr;
      });
      if (!isAssigned) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      return { eligible: true };
    }

    return {
      eligible: false,
      reason: "You are not eligible to use this coupon",
    };
  }

  // 6. Category based (Step 7.1)
  if (distributionType === "category_based") {
    if (!Array.isArray(coupon.categories) || coupon.categories.length === 0) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    if (cartItems !== null && cartItems !== undefined) {
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const categorySet = new Set(
        coupon.categories.map((c) => (c._id ? c._id.toString() : c.toString()))
      );
      const hasMatch = cartItems.some((item) => {
        const prod = item.product || item;
        const prodCat = prod?.category
          ? prod.category._id
            ? prod.category._id.toString()
            : prod.category.toString()
          : null;
        const prodCats = Array.isArray(prod?.categories)
          ? prod.categories.map((c) => (c._id ? c._id.toString() : c.toString()))
          : [];
        return (prodCat && categorySet.has(prodCat)) || prodCats.some((cid) => categorySet.has(cid));
      });
      if (!hasMatch) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
    }
    return { eligible: true };
  }

  // 7. Product based (Step 7.2)
  if (distributionType === "product_based") {
    if (!Array.isArray(coupon.products) || coupon.products.length === 0) {
      return {
        eligible: false,
        reason: "You are not eligible to use this coupon",
      };
    }
    if (cartItems !== null && cartItems !== undefined) {
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
      const productSet = new Set(
        coupon.products.map((p) => (p._id ? p._id.toString() : p.toString()))
      );
      const hasMatch = cartItems.some((item) => {
        const prod = item.product || item;
        const prodId = prod?._id ? prod._id.toString() : prod?.toString();
        return prodId && productSet.has(prodId);
      });
      if (!hasMatch) {
        return {
          eligible: false,
          reason: "You are not eligible to use this coupon",
        };
      }
    }
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: "You are not eligible to use this coupon",
  };
};

/*
========================================================
CALCULATE CART ELIGIBLE SUBTOTAL (STEP 7.3)
========================================================
*/
export const calculateCartEligibleSubtotal = async ({
  coupon,
  cartItems = [],
  fallbackCartTotal = 0,
}) => {
  const distributionType = coupon.distributionType || "global";

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    if (distributionType === "category_based" || distributionType === "product_based") {
      return {
        eligibleSubtotal: 0,
        totalCartSubtotal: fallbackCartTotal,
        hasEligibleItems: false,
      };
    }
    return {
      eligibleSubtotal: fallbackCartTotal,
      totalCartSubtotal: fallbackCartTotal,
      hasEligibleItems: true,
    };
  }

  // Fetch product documents from DB for authoritative prices & categories
  const productIds = cartItems
    .map((item) => {
      const p = item.product || item;
      return p?._id ? p._id.toString() : p?.toString();
    })
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const dbProducts = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map();
  dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

  const categorySet = new Set(
    (coupon.categories || []).map((c) => (c._id ? c._id.toString() : c.toString()))
  );
  const productSet = new Set(
    (coupon.products || []).map((p) => (p._id ? p._id.toString() : p.toString()))
  );

  let totalCartSubtotal = 0;
  let eligibleSubtotal = 0;
  let hasEligibleItems = false;

  for (const item of cartItems) {
    const rawProd = item.product || item;
    const prodId = rawProd?._id ? rawProd._id.toString() : rawProd?.toString();
    const product = productMap.get(prodId) || (rawProd?.price !== undefined ? rawProd : null);
    if (!product) continue;

    const unitPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = Number(unitPrice || 0) * quantity;

    totalCartSubtotal += lineTotal;

    let isItemEligible = false;
    if (distributionType === "category_based") {
      const prodCatId = product.category
        ? product.category._id
          ? product.category._id.toString()
          : product.category.toString()
        : null;
      const prodCatIds = Array.isArray(product.categories)
        ? product.categories.map((c) => (c._id ? c._id.toString() : c.toString()))
        : [];
      if (
        (prodCatId && categorySet.has(prodCatId)) ||
        prodCatIds.some((cid) => categorySet.has(cid))
      ) {
        isItemEligible = true;
      }
    } else if (distributionType === "product_based") {
      if (prodId && productSet.has(prodId)) {
        isItemEligible = true;
      }
    } else {
      isItemEligible = true;
    }

    if (isItemEligible) {
      eligibleSubtotal += lineTotal;
      hasEligibleItems = true;
    }
  }

  if (totalCartSubtotal === 0 && fallbackCartTotal > 0) {
    totalCartSubtotal = fallbackCartTotal;
  }

  return {
    eligibleSubtotal: Math.round(eligibleSubtotal * 100) / 100,
    totalCartSubtotal: Math.round(totalCartSubtotal * 100) / 100,
    hasEligibleItems,
  };
};

/*
========================================
CREATE COUPON
POST /api/coupons
========================================
*/
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minimumOrderValue = 0,
      maximumDiscount,
      expiryDate,
      usageLimit = 0,
      usedCount = 0,
      isActive = true,

      // Distribution & Eligibility Fields (Step 1, Step 12, Step 13)
      distributionType = "global",
      assignedUsers = [],
      eligibilityRules,
      inactiveDays = 0,
      newUserDays = 0,
      categories = [],
      products = [],
      perUserLimit = 1,
      priority = 0,
      eligibilityDuration = 7,
    } = req.body;

    /*
    VALIDATION: REQUIRED FIELDS
    */
    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!discountType) {
      return res.status(400).json({
        success: false,
        message: "Discount type is required",
      });
    }

    if (discountValue === undefined || discountValue === null || discountValue === "") {
      return res.status(400).json({
        success: false,
        message: "Discount value is required",
      });
    }

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is required",
      });
    }

    /*
    SANITIZE & NORMALIZE
    */
    const normalizedCode = String(code).trim().toUpperCase();

    // Check discount type enum
    const cleanType = String(discountType).trim().toLowerCase();
    if (!["flat", "percentage"].includes(cleanType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be either 'flat' or 'percentage'",
      });
    }

    // Check discount value
    const numDiscountValue = Number(discountValue);
    if (isNaN(numDiscountValue) || numDiscountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value cannot be negative",
      });
    }

    if (cleanType === "percentage" && numDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must not exceed 100",
      });
    }

    // Check minimum order value
    const numMinOrder = Number(minimumOrderValue) || 0;
    if (numMinOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum order value cannot be negative",
      });
    }

    // Check maximum discount
    let numMaxDiscount = null;
    if (maximumDiscount !== undefined && maximumDiscount !== null && maximumDiscount !== "") {
      numMaxDiscount = Number(maximumDiscount);
      if (isNaN(numMaxDiscount) || numMaxDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: "Maximum discount cannot be negative",
        });
      }
    }

    // Check expiry date
    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date format",
      });
    }

    // Check usage limits
    const numUsageLimit = Number(usageLimit) || 0;
    const numUsedCount = Number(usedCount) || 0;

    if (numUsageLimit < 0) {
      return res.status(400).json({
        success: false,
        message: "Usage limit cannot be negative",
      });
    }

    if (numUsedCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Used count cannot be negative",
      });
    }

    if (numUsageLimit > 0 && numUsedCount > numUsageLimit) {
      return res.status(400).json({
        success: false,
        message: "usedCount cannot exceed usageLimit when usageLimit is greater than 0",
      });
    }

    /*
    CHECK DUPLICATE CODE
    */
    const existingCoupon = await Coupon.findOne({ code: normalizedCode });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    /*
    VALIDATE DISTRIBUTION & ELIGIBILITY FIELDS (STEP 1, STEP 12, STEP 13)
    */
    const distResult = sanitizeDistributionFields({
      distributionType,
      assignedUsers,
      eligibilityRules,
      inactiveDays,
      newUserDays,
      categories,
      products,
      perUserLimit,
      priority,
      eligibilityDuration,
      isUpdate: false,
    });

    if (distResult.error) {
      return res.status(400).json({
        success: false,
        message: distResult.error,
      });
    }

    /*
    CREATE COUPON (WHITELISTED FIELDS ONLY)
    */
    const coupon = await Coupon.create({
      code: normalizedCode,
      discountType: cleanType,
      discountValue: numDiscountValue,
      minimumOrderValue: numMinOrder,
      maximumDiscount: numMaxDiscount,
      expiryDate: parsedExpiry,
      usageLimit: numUsageLimit,
      usedCount: numUsedCount,
      isActive: isActive === undefined ? true : Boolean(isActive === true || isActive === "true"),

      distributionType: distResult.data.distributionType,
      assignedUsers: distResult.data.assignedUsers,
      eligibilityRules: distResult.data.eligibilityRules,
      inactiveDays: distResult.data.inactiveDays,
      newUserDays: distResult.data.newUserDays,
      categories: distResult.data.categories,
      products: distResult.data.products,
      perUserLimit: distResult.data.perUserLimit,
      priority: distResult.data.priority,
      eligibilityDuration: distResult.data.eligibilityDuration,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error("Create Coupon Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ") || "Validation error",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create coupon",
    });
  }
};

/*
========================================
GET ALL COUPONS
GET /api/coupons
========================================
*/
export const getCoupons = async (req, res) => {
  try {
    const { isActive, discountType, distributionType, search } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true" || isActive === true;
    }

    if (discountType && ["flat", "percentage"].includes(discountType.toLowerCase())) {
      filter.discountType = discountType.toLowerCase();
    }

    if (distributionType && ALLOWED_DISTRIBUTION_TYPES.includes(distributionType.toLowerCase())) {
      filter.distributionType = distributionType.toLowerCase();
    }

    if (search && String(search).trim()) {
      filter.code = { $regex: String(search).trim(), $options: "i" };
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error("Get Coupons Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coupons",
    });
  }
};

/*
========================================
GET COUPON BY ID
GET /api/coupons/:id
========================================
*/
export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon = await Coupon.findById(id)
      .populate("assignedUsers", "name email phone")
      .populate("categories", "name image")
      .populate("products", "name price images");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("Get Coupon By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coupon",
    });
  }
};

/*
========================================
UPDATE COUPON
PUT /api/coupons/:id
========================================
*/
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const {
      code,
      discountType,
      discountValue,
      minimumOrderValue,
      maximumDiscount,
      expiryDate,
      usageLimit,
      usedCount,
      isActive,

      // Distribution & Eligibility Fields (Step 1, Step 12, Step 13)
      distributionType,
      assignedUsers,
      eligibilityRules,
      inactiveDays,
      newUserDays,
      categories,
      products,
      perUserLimit,
      priority,
      eligibilityDuration,
    } = req.body;

    /*
    CODE UPDATE & DUPLICATE CHECK
    */
    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Coupon code cannot be empty",
        });
      }

      if (normalizedCode !== coupon.code) {
        const duplicate = await Coupon.findOne({
          code: normalizedCode,
          _id: { $ne: id },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: "Coupon code already exists",
          });
        }
        coupon.code = normalizedCode;
      }
    }

    /*
    DISCOUNT TYPE & VALUE UPDATE
    */
    const newType =
      discountType !== undefined
        ? String(discountType).trim().toLowerCase()
        : coupon.discountType;

    if (discountType !== undefined) {
      if (!["flat", "percentage"].includes(newType)) {
        return res.status(400).json({
          success: false,
          message: "Discount type must be either 'flat' or 'percentage'",
        });
      }
      coupon.discountType = newType;
    }

    if (discountValue !== undefined) {
      const val = Number(discountValue);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value cannot be negative",
        });
      }

      if (newType === "percentage" && val > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount must not exceed 100",
        });
      }
      coupon.discountValue = val;
    } else if (discountType !== undefined && newType === "percentage" && coupon.discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must not exceed 100",
      });
    }

    /*
    MINIMUM ORDER VALUE UPDATE
    */
    if (minimumOrderValue !== undefined) {
      const mov = Number(minimumOrderValue);
      if (isNaN(mov) || mov < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum order value cannot be negative",
        });
      }
      coupon.minimumOrderValue = mov;
    }

    /*
    MAXIMUM DISCOUNT UPDATE
    */
    if (maximumDiscount !== undefined) {
      if (maximumDiscount === null || maximumDiscount === "") {
        coupon.maximumDiscount = null;
      } else {
        const maxD = Number(maximumDiscount);
        if (isNaN(maxD) || maxD < 0) {
          return res.status(400).json({
            success: false,
            message: "Maximum discount cannot be negative",
          });
        }
        coupon.maximumDiscount = maxD;
      }
    }

    /*
    EXPIRY DATE UPDATE
    */
    if (expiryDate !== undefined) {
      const exp = new Date(expiryDate);
      if (isNaN(exp.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date format",
        });
      }
      coupon.expiryDate = exp;
    }

    /*
    USAGE LIMIT & USED COUNT UPDATE
    */
    const targetUsageLimit =
      usageLimit !== undefined ? Number(usageLimit) : coupon.usageLimit;
    const targetUsedCount =
      usedCount !== undefined ? Number(usedCount) : coupon.usedCount;

    if (isNaN(targetUsageLimit) || targetUsageLimit < 0) {
      return res.status(400).json({
        success: false,
        message: "Usage limit cannot be negative",
      });
    }

    if (isNaN(targetUsedCount) || targetUsedCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Used count cannot be negative",
      });
    }

    if (targetUsageLimit > 0 && targetUsedCount > targetUsageLimit) {
      return res.status(400).json({
        success: false,
        message: "usedCount cannot exceed usageLimit when usageLimit is greater than 0",
      });
    }

    if (usageLimit !== undefined) coupon.usageLimit = targetUsageLimit;
    if (usedCount !== undefined) coupon.usedCount = targetUsedCount;

    /*
    IS ACTIVE UPDATE
    */
    if (isActive !== undefined) {
      coupon.isActive = isActive === true || isActive === "true";
    }

    /*
    DISTRIBUTION & ELIGIBILITY FIELDS UPDATE (STEP 1, STEP 12, STEP 13)
    */
    const distResult = sanitizeDistributionFields({
      distributionType,
      assignedUsers,
      eligibilityRules,
      inactiveDays,
      newUserDays,
      categories,
      products,
      perUserLimit,
      priority,
      eligibilityDuration,
      isUpdate: true,
      currentCoupon: coupon,
    });

    if (distResult.error) {
      return res.status(400).json({
        success: false,
        message: distResult.error,
      });
    }

    if (distResult.data.distributionType !== undefined) {
      coupon.distributionType = distResult.data.distributionType;
    }
    if (distResult.data.assignedUsers !== undefined) {
      coupon.assignedUsers = distResult.data.assignedUsers;
    }
    if (distResult.data.eligibilityRules !== undefined) {
      coupon.eligibilityRules = distResult.data.eligibilityRules;
    }
    if (distResult.data.inactiveDays !== undefined) {
      coupon.inactiveDays = distResult.data.inactiveDays;
    }
    if (distResult.data.newUserDays !== undefined) {
      coupon.newUserDays = distResult.data.newUserDays;
    }
    if (distResult.data.categories !== undefined) {
      coupon.categories = distResult.data.categories;
    }
    if (distResult.data.products !== undefined) {
      coupon.products = distResult.data.products;
    }
    if (distResult.data.perUserLimit !== undefined) {
      coupon.perUserLimit = distResult.data.perUserLimit;
    }
    if (distResult.data.priority !== undefined) {
      coupon.priority = distResult.data.priority;
    }
    if (distResult.data.eligibilityDuration !== undefined) {
      coupon.eligibilityDuration = distResult.data.eligibilityDuration;
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("Update Coupon Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ") || "Validation error",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update coupon",
    });
  }
};

/*
========================================
DELETE COUPON
DELETE /api/coupons/:id
========================================
*/
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete coupon",
    });
  }
};

/*
========================================
VALIDATE COUPON (CUSTOMER FACING)
POST /api/coupons/validate
========================================
*/
export const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, items, cartItems } = req.body;

    /*
    0. CHECK MULTIPLE COUPONS / STACKING CONFLICT (STEP 13.3)
    */
    if (Array.isArray(req.body.codes) && req.body.codes.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Only one coupon can be applied to an order",
      });
    }
    if (typeof code === "string" && code.includes(",")) {
      return res.status(400).json({
        success: false,
        message: "Only one coupon can be applied to an order",
      });
    }

    /*
    1. VALIDATE COUPON CODE INPUT
    */
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    /*
    2. VALIDATE CART TOTAL INPUT
    */
    if (cartTotal === undefined || cartTotal === null || cartTotal === "") {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    const numCartTotal = Number(cartTotal);
    if (isNaN(numCartTotal) || numCartTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    /*
    3. NORMALIZE COUPON CODE
    */
    const normalizedCode = code.trim().toUpperCase();

    /*
    4. CHECK IF COUPON EXISTS
    */
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    /*
    5. CHECK IF ACTIVE
    */
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Coupon is inactive",
      });
    }

    /*
    6. CHECK EXPIRY DATE (STEP 12.3)
    */
    const now = new Date();
    if (new Date(coupon.expiryDate) < now) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
      });
    }

    /*
    7. CHECK GLOBAL USAGE LIMIT
    */
    const usageLimit = Number(coupon.usageLimit) || 0;
    const usedCount = Number(coupon.usedCount) || 0;
    if (usageLimit > 0 && usedCount >= usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    const currentUserId = req.user?.id || req.user?._id;

    /*
    8. CHECK PER-USER USAGE LIMIT (STEP 8.1)
    */
    if (currentUserId) {
      const perUserLimit = Number(coupon.perUserLimit) || 1;
      const userUsageCount = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId: currentUserId,
      });

      if (userUsageCount >= perUserLimit) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon the maximum number of times",
        });
      }
    }

    /*
    9. RESOLVE CART ITEMS FROM REQ OR USER'S DB CART
    */
    let resolvedCartItems = Array.isArray(items) ? items : (Array.isArray(cartItems) ? cartItems : null);
    if (!resolvedCartItems && currentUserId) {
      const userCart = await Cart.findOne({ user: currentUserId }).populate("items.product").lean();
      if (userCart && Array.isArray(userCart.items)) {
        resolvedCartItems = userCart.items;
      }
    }

    /*
    10. CHECK ELIGIBILITY VIA SHARED LOGIC
    */
    const eligibilityCheck = await isUserEligibleForCoupon({
      coupon,
      userId: currentUserId,
      cartItems: resolvedCartItems,
    });

    if (!eligibilityCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibilityCheck.reason || "You are not eligible to use this coupon",
      });
    }

    /*
    11. CALCULATE ELIGIBLE SUBTOTAL (STEP 7.3 & STEP 7.5)
    */
    const { eligibleSubtotal, hasEligibleItems } = await calculateCartEligibleSubtotal({
      coupon,
      cartItems: resolvedCartItems,
      fallbackCartTotal: numCartTotal,
    });

    if (
      (coupon.distributionType === "category_based" || coupon.distributionType === "product_based") &&
      (!hasEligibleItems || eligibleSubtotal <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "You are not eligible to use this coupon",
      });
    }

    /*
    12. CHECK MINIMUM ORDER VALUE
    For category/product based coupons, apply against eligibleSubtotal
    */
    const minOrderValue = Number(coupon.minimumOrderValue) || 0;
    const comparisonSubtotal =
      coupon.distributionType === "category_based" || coupon.distributionType === "product_based"
        ? eligibleSubtotal
        : numCartTotal;

    if (comparisonSubtotal < minOrderValue) {
      return res.status(400).json({
        success: false,
        message: "Minimum order value not reached",
      });
    }

    /*
    13. CALCULATE DISCOUNT
    For category/product coupons, discount applies only to eligible subtotal
    */
    let discount = 0;
    const baseSubtotal =
      coupon.distributionType === "category_based" || coupon.distributionType === "product_based"
        ? eligibleSubtotal
        : numCartTotal;

    if (coupon.discountType === "flat") {
      discount = Number(coupon.discountValue);
    } else if (coupon.discountType === "percentage") {
      discount = (baseSubtotal * Number(coupon.discountValue)) / 100;
      const maxDiscount = Number(coupon.maximumDiscount);
      if (
        coupon.maximumDiscount !== null &&
        coupon.maximumDiscount !== undefined &&
        !isNaN(maxDiscount) &&
        maxDiscount > 0
      ) {
        if (discount > maxDiscount) {
          discount = maxDiscount;
        }
      }
    }

    /*
    14. SAFETY RULES
    - Discount cannot exceed eligible subtotal or cart total
    - Final amount cannot be negative
    - Round monetary values properly
    - Do NOT modify usedCount during validation
    - Do NOT create CouponUsage during validation
    */
    if (discount > baseSubtotal) {
      discount = baseSubtotal;
    }
    if (discount > numCartTotal) {
      discount = numCartTotal;
    }

    let finalAmount = numCartTotal - discount;
    if (finalAmount < 0) {
      finalAmount = 0;
    }

    discount = Math.round(discount * 100) / 100;
    finalAmount = Math.round(finalAmount * 100) / 100;

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      cartTotal: numCartTotal,
      eligibleSubtotal,
      discount,
      finalAmount,
    });
  } catch (error) {
    console.error("Validate Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to validate coupon",
    });
  }
};

/*
========================================
GET AVAILABLE COUPONS (CUSTOMER FACING)
GET /api/coupons/available (STEP 10 & STEP 13)
========================================
*/
export const getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    const currentUserId = req.user?.id || req.user?._id;

    // Fetch user created date, activity, order stats, and cart for eligibility verification
    let userDoc = null;
    let cachedStats = null;
    let userCart = null;
    if (currentUserId) {
      [userDoc, cachedStats, userCart] = await Promise.all([
        User.findById(currentUserId).select("createdAt lastLoginAt previousLoginAt").lean(),
        getCustomerOrderStats(currentUserId),
        Cart.findOne({ user: currentUserId }).populate("items.product").lean(),
      ]);
    }

    // Query active, non-expired coupons whose global usage limit is not exhausted
    // Supports all distribution types: global, new_user, inactive_user, selected_users, user_group, category_based, product_based
    const candidateCoupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: now },
      $or: [
        { usageLimit: 0 },
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    })
      .select("code discountType discountValue minimumOrderValue maximumDiscount expiryDate distributionType perUserLimit newUserDays inactiveDays assignedUsers eligibilityRules categories products priority eligibilityDuration createdAt")
      .populate("categories", "name")
      .populate("products", "name price")
      .sort({ priority: -1, expiryDate: 1, createdAt: -1 })
      .lean();

    // Retrieve user's usage counts for candidate coupons to enforce perUserLimit
    let usageMap = {};
    if (currentUserId && candidateCoupons.length > 0) {
      const usages = await CouponUsage.find({
        userId: currentUserId,
        couponId: { $in: candidateCoupons.map((c) => c._id) },
      }).lean();
      for (const u of usages) {
        const cId = u.couponId.toString();
        usageMap[cId] = (usageMap[cId] || 0) + 1;
      }
    }

    // Filter candidate coupons by eligibility and perUserLimit
    const eligibleCoupons = [];
    for (const coupon of candidateCoupons) {
      // 1. Enforce perUserLimit (Step 8 & Step 10)
      if (currentUserId) {
        const count = usageMap[coupon._id.toString()] || 0;
        const perUserLimit = Number(coupon.perUserLimit) || 1;
        if (count >= perUserLimit) {
          continue;
        }
      }

      // 2. Check eligibility via shared function
      const check = await isUserEligibleForCoupon({
        coupon,
        userId: currentUserId,
        userDoc,
        cachedStats,
        cartItems: userCart?.items || [],
      });

      if (check.eligible) {
        eligibleCoupons.push(coupon);
      }
    }

    // Customer API security: Do NOT expose assignedUsers or internal eligibilityRules in response
    const sanitizedCoupons = eligibleCoupons.map((coupon) => {
      const obj = { ...coupon };
      delete obj.assignedUsers;
      delete obj.eligibilityRules;
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedCoupons.length,
      coupons: sanitizedCoupons,
    });
  } catch (error) {
    console.error("Get Available Coupons Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch available coupons",
    });
  }
};

/*
========================================
GET USER'S COUPON USAGE HISTORY
GET /api/coupons/my-usage (STEP 9.2)
========================================
*/
export const getMyCouponUsage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const usages = await CouponUsage.find({ userId })
      .populate("couponId", "code discountType discountValue")
      .populate("orderId", "orderStatus paymentStatus totalAmount discount couponDiscount createdAt")
      .sort({ usedAt: -1 })
      .lean();

    const formatted = usages.map((u) => ({
      couponCode: u.couponId?.code || "UNKNOWN",
      discount:
        u.orderId?.couponDiscount !== undefined
          ? u.orderId.couponDiscount
          : u.orderId?.discount !== undefined
          ? u.orderId.discount
          : u.couponId?.discountValue || 0,
      orderId: u.orderId?._id || u.orderId,
      usedAt: u.usedAt,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      usages: formatted,
    });
  } catch (error) {
    console.error("Get My Coupon Usage Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coupon usage history",
    });
  }
};

/*
========================================
GET ADMIN COUPON USAGE HISTORY
GET /api/coupons/:couponId/usage (STEP 9.3)
========================================
*/
export const getCouponUsageHistory = async (req, res) => {
  try {
    const { couponId } = req.params;
    if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon = await Coupon.findById(couponId).select("code");
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const usages = await CouponUsage.find({ couponId })
      .populate("userId", "name email phone")
      .populate("orderId", "orderStatus paymentStatus totalAmount discount couponDiscount createdAt")
      .sort({ usedAt: -1 })
      .lean();

    const formatted = usages.map((u) => ({
      couponCode: coupon.code,
      customer: u.userId
        ? {
            id: u.userId._id,
            name: u.userId.name,
            email: u.userId.email,
            phone: u.userId.phone,
          }
        : null,
      order: u.orderId
        ? {
            id: u.orderId._id,
            orderStatus: u.orderId.orderStatus,
            paymentStatus: u.orderId.paymentStatus,
            totalAmount: u.orderId.totalAmount,
            discount:
              u.orderId.couponDiscount !== undefined
                ? u.orderId.couponDiscount
                : u.orderId.discount || 0,
            createdAt: u.orderId.createdAt,
          }
        : null,
      usedAt: u.usedAt,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      couponCode: coupon.code,
      usages: formatted,
    });
  } catch (error) {
    console.error("Get Coupon Usage History Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coupon usage history",
    });
  }
};

