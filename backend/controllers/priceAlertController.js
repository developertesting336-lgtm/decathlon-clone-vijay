import PriceAlert from "../models/PriceAlert.js";
import Product from "../models/Product.js";

/**
 * Subscribe to price drop alerts for a product.
 * POST /api/price-alerts
 */
export const createPriceAlert = async (req, res) => {
  try {
    const { productId, email, targetPrice } = req.body;
    const userId = req.user?._id || req.user?.id || null;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const recipientEmail = email || req.user?.email;
    if (!recipientEmail) {
      return res.status(400).json({ message: "Email is required to receive alerts" });
    }

    const currentSellingPrice = Number(product.discountPrice || product.price || 0);

    // Look for existing active alert
    let alert = await PriceAlert.findOne({
      $or: [
        ...(userId ? [{ user: userId, product: productId }] : []),
        { email: recipientEmail.toLowerCase().trim(), product: productId },
      ],
    });

    if (alert) {
      alert.isActive = true;
      alert.initialPrice = currentSellingPrice;
      if (targetPrice) alert.targetPrice = Number(targetPrice);
      if (userId && !alert.user) alert.user = userId;
      await alert.save();

      return res.status(200).json({
        success: true,
        message: "Price alert updated successfully! You will be notified when the price drops.",
        alert,
      });
    }

    alert = await PriceAlert.create({
      user: userId,
      product: productId,
      email: recipientEmail.toLowerCase().trim(),
      initialPrice: currentSellingPrice,
      targetPrice: targetPrice ? Number(targetPrice) : null,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Price alert created successfully! We will alert you whenever the price decreases.",
      alert,
    });
  } catch (error) {
    console.error("Create Price Alert Error:", error);
    return res.status(500).json({ message: error.message || "Failed to create price alert" });
  }
};

/**
 * Check if the current user/email is tracking a product.
 * GET /api/price-alerts/status/:productId
 */
export const getPriceAlertStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id || req.user?.id || null;
    const email = req.query.email || req.user?.email || null;

    if (!userId && !email) {
      return res.status(200).json({ isTracking: false });
    }

    const query = {
      product: productId,
      isActive: true,
      $or: [
        ...(userId ? [{ user: userId }] : []),
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
      ],
    };

    const alert = await PriceAlert.findOne(query);

    return res.status(200).json({
      isTracking: !!alert,
      alert: alert || null,
    });
  } catch (error) {
    console.error("Get Price Alert Status Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * List active price alerts for the logged-in user.
 * GET /api/price-alerts/my-alerts
 */
export const getMyPriceAlerts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const alerts = await PriceAlert.find({
      user: userId,
      isActive: true,
    })
      .populate("product", "name price discountPrice images brand rating reviews")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Get My Price Alerts Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Unsubscribe / delete a price alert.
 * DELETE /api/price-alerts/:id
 */
export const deletePriceAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const alert = await PriceAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: "Price alert not found" });
    }

    if (userId && alert.user && alert.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this alert" });
    }

    alert.isActive = false;
    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Price alert unsubscribed successfully",
    });
  } catch (error) {
    console.error("Delete Price Alert Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
