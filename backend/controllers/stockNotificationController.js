import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import StockNotification from "../models/StockNotification.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

/**
 * Helper to optionally extract user from Authorization header if present
 */
const getOptionalUser = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    }
  } catch (err) {
    // Ignore invalid/expired token for optional auth
  }
  return null;
};

/**
 * SUBSCRIBE TO RESTOCK NOTIFICATION
 * POST /stock-notifications or /api/stock-notifications
 */
export const subscribeToStockNotification = async (req, res) => {
  try {
    const { productId: bodyProdId, product: bodyAltProdId, email: bodyEmail } = req.body;
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

    // Check if product is actually out of stock
    const currentStock = Number(product.stock || 0);
    if (currentStock > 0) {
      return res.status(400).json({
        success: false,
        message: "This product is currently in stock.",
        inStock: true,
      });
    }

    // Determine user ID and email
    const optionalUser = req.user || getOptionalUser(req);
    let userId = optionalUser?.id || optionalUser?._id || null;
    let subscriberEmail = bodyEmail ? String(bodyEmail).trim().toLowerCase() : null;

    if (userId && !subscriberEmail) {
      const user = await User.findById(userId).select("email");
      if (user?.email) {
        subscriberEmail = user.email.toLowerCase();
      }
    }

    if (!subscriberEmail) {
      return res.status(400).json({
        success: false,
        message: "Email address is required for restock notification",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(subscriberEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check if an active (unnotified) subscription already exists
    const activeSub = await StockNotification.findOne({
      product: productId,
      notified: false,
      $or: [
        ...(userId ? [{ user: userId }] : []),
        { email: subscriberEmail },
      ],
    });

    if (activeSub) {
      return res.status(200).json({
        success: true,
        alreadySubscribed: true,
        message: "You are already subscribed to receive restock notifications for this product.",
        subscription: activeSub,
      });
    }

    // Check if a previously notified subscription exists (from an older restock) to re-activate
    const prevSub = await StockNotification.findOne({
      product: productId,
      $or: [
        ...(userId ? [{ user: userId }] : []),
        { email: subscriberEmail },
      ],
    });

    if (prevSub) {
      prevSub.notified = false;
      prevSub.notifiedAt = null;
      prevSub.email = subscriberEmail;
      if (userId) prevSub.user = userId;
      await prevSub.save();

      return res.status(201).json({
        success: true,
        message: "You will be notified when this product is back in stock.",
        subscription: prevSub,
      });
    }

    // Create new subscription
    const subscription = await StockNotification.create({
      product: productId,
      user: userId,
      email: subscriberEmail,
      notified: false,
    });

    return res.status(201).json({
      success: true,
      message: "You will be notified when this product is back in stock.",
      subscription,
    });
  } catch (error) {
    console.error("Subscribe Stock Notification Error:", error);
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadySubscribed: true,
        message: "You are already subscribed to receive restock notifications for this product.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to subscribe to restock notification",
    });
  }
};

/**
 * GET MY STOCK NOTIFICATIONS
 * GET /stock-notifications/my or /api/stock-notifications/my
 * Requires: Logged in user
 */
export const getMyStockNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId).select("email");
    const userEmail = user?.email ? user.email.toLowerCase() : null;

    const query = {
      $or: [
        { user: userId },
        ...(userEmail ? [{ email: userEmail }] : []),
      ],
    };

    const notifications = await StockNotification.find(query)
      .populate("product", "name images price stock brand category subcategory")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get My Stock Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock notifications",
    });
  }
};

/**
 * UNSUBSCRIBE FROM STOCK NOTIFICATION
 * DELETE /stock-notifications/:productId or /api/stock-notifications/:productId
 */
export const unsubscribeFromStockNotification = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const optionalUser = req.user || getOptionalUser(req);
    const userId = optionalUser?.id || optionalUser?._id;
    const email = req.query.email || req.body?.email;

    const filter = {
      product: productId,
    };

    if (userId) {
      filter.$or = [
        { user: userId },
        ...(email ? [{ email: String(email).trim().toLowerCase() }] : []),
      ];
    } else if (email) {
      filter.email = String(email).trim().toLowerCase();
    } else {
      return res.status(400).json({
        success: false,
        message: "User authentication or email address is required to unsubscribe",
      });
    }

    const result = await StockNotification.deleteMany(filter);

    return res.status(200).json({
      success: true,
      message: "Unsubscribed from stock notification successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Unsubscribe Stock Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unsubscribe",
    });
  }
};

/**
 * ADMIN: GET ALL STOCK NOTIFICATIONS / SUBSCRIBERS
 * GET /stock-notifications/admin/all or /api/stock-notifications/admin/all
 * Requires: Admin
 */
export const getAdminStockNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.productId && mongoose.Types.ObjectId.isValid(req.query.productId)) {
      filter.product = req.query.productId;
    }
    if (req.query.notified !== undefined) {
      filter.notified = req.query.notified === "true";
    }

    const [notifications, total] = await Promise.all([
      StockNotification.find(filter)
        .populate("product", "name images price stock brand")
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockNotification.countDocuments(filter),
    ]);

    // Product summary grouping
    const productSummary = await StockNotification.aggregate([
      { $match: { notified: false } },
      {
        $group: {
          _id: "$product",
          pendingSubscribers: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          productId: "$_id",
          name: "$productDetails.name",
          stock: "$productDetails.stock",
          price: "$productDetails.price",
          pendingSubscribers: 1,
        },
      },
      { $sort: { pendingSubscribers: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      notifications,
      productSummary,
    });
  } catch (error) {
    console.error("Admin Get Stock Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock notifications",
    });
  }
};
