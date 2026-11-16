import Offer from "../models/Offer.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

/**
 * Synchronize offer statuses based on current date/time
 */
export const syncOfferStatuses = async () => {
  const now = new Date();

  // 1. Move scheduled -> active when start date has arrived
  await Offer.updateMany(
    {
      isActive: true,
      status: "scheduled",
      startDate: { $lte: now },
      endDate: { $gt: now },
    },
    { $set: { status: "active" } }
  );

  // 2. Move active/scheduled -> expired when end date has passed
  await Offer.updateMany(
    {
      status: { $in: ["active", "scheduled"] },
      endDate: { $lte: now },
    },
    { $set: { status: "expired" } }
  );
};

/**
 * Evaluate and calculate the winning offer for a specific product
 * Priority rules:
 * 1. Higher offer priority wins
 * 2. In tie, the offer providing the highest discount wins
 */
export const calculateBestOfferForProduct = (product, activeOffers = []) => {
  if (!product || !activeOffers.length) return null;

  const originalPrice = Number(product.price) || 0;
  if (originalPrice <= 0) return null;

  const prodIdStr = product._id?.toString();
  const prodCatId = product.category?._id?.toString() || product.category?.toString() || "";

  // Filter matching offers
  const matchingOffers = activeOffers.filter((offer) => {
    if (!offer.isActive) return false;
    const now = new Date();
    if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) return false;

    if (offer.targetType === "sitewide") return true;

    if (offer.targetType === "product") {
      return Array.isArray(offer.applicableProducts) &&
        offer.applicableProducts.some((p) => (p._id || p).toString() === prodIdStr);
    }

    if (offer.targetType === "category") {
      return Array.isArray(offer.applicableCategories) &&
        offer.applicableCategories.some((c) => (c._id || c).toString() === prodCatId);
    }

    return false;
  });

  if (!matchingOffers.length) return null;

  // Calculate discount amount for each matching offer
  const evaluated = matchingOffers.map((offer) => {
    let discountAmount = 0;
    if (offer.discountType === "percentage") {
      discountAmount = (originalPrice * Number(offer.discountValue)) / 100;
      if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
        discountAmount = offer.maxDiscountAmount;
      }
    } else if (offer.discountType === "flat") {
      discountAmount = Number(offer.discountValue);
    }

    discountAmount = Math.min(originalPrice - 1, Math.max(0, Math.round(discountAmount)));
    const discountedPrice = Math.max(1, originalPrice - discountAmount);
    const discountPercent = Math.round((discountAmount / originalPrice) * 100);

    return {
      offer,
      priority: Number(offer.priority) || 1,
      discountAmount,
      discountedPrice,
      discountPercent,
    };
  });

  // Sort by Priority DESC, then by discountAmount DESC
  evaluated.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.discountAmount - a.discountAmount;
  });

  const winner = evaluated[0];
  return {
    offerId: winner.offer._id,
    title: winner.offer.title,
    bannerText: winner.offer.bannerText,
    badgeLabel: winner.offer.badgeLabel || "Special Deal",
    targetType: winner.offer.targetType,
    discountType: winner.offer.discountType,
    discountValue: winner.offer.discountValue,
    priority: winner.priority,
    discountAmount: winner.discountAmount,
    discountedPrice: winner.discountedPrice,
    discountPercent: winner.discountPercent,
    endDate: winner.offer.endDate,
  };
};

/**
 * ADMIN: Get all offers with filters, search, and pagination
 */
export const getAdminOffers = async (req, res) => {
  try {
    await syncOfferStatuses();

    const { status, targetType, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && ["scheduled", "active", "expired", "disabled"].includes(status)) {
      query.status = status;
    }

    if (targetType && ["product", "category", "sitewide"].includes(targetType)) {
      query.targetType = targetType;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { bannerText: { $regex: search.trim(), $options: "i" } },
        { badgeLabel: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [offers, totalOffers] = await Promise.all([
      Offer.find(query)
        .populate("applicableProducts", "name price images discountPrice")
        .populate("applicableCategories", "name image")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      totalOffers,
      totalPages: Math.ceil(totalOffers / Number(limit)) || 1,
      currentPage: Number(page),
      offers,
    });
  } catch (error) {
    console.error("Error fetching admin offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offers",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Get single offer by ID
 */
export const getOfferById = async (req, res) => {
  try {
    await syncOfferStatuses();

    const offer = await Offer.findById(req.params.id)
      .populate("applicableProducts", "name price images discountPrice")
      .populate("applicableCategories", "name image");

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offer",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Create new offer (Product or Category offer)
 */
export const createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      bannerText,
      badgeLabel,
      targetType,
      applicableProducts,
      applicableCategories,
      discountType,
      discountValue,
      maxDiscountAmount,
      startDate,
      endDate,
      priority,
      isActive,
    } = req.body;

    if (!title || !targetType || !discountType || discountValue === undefined || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: title, targetType, discountType, discountValue, startDate, and endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start or end date format",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be chronologically after the start date",
      });
    }

    // Validation for target scopes
    if (targetType === "product") {
      if (!Array.isArray(applicableProducts) || applicableProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one product for a Product Offer",
        });
      }
    } else if (targetType === "category") {
      if (!Array.isArray(applicableCategories) || applicableCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one category for a Category Offer",
        });
      }
    }

    const offer = new Offer({
      title: title.trim(),
      description: description?.trim() || "",
      bannerText: bannerText?.trim() || "",
      badgeLabel: badgeLabel?.trim() || "Special Deal",
      targetType,
      applicableProducts: targetType === "product" ? applicableProducts : [],
      applicableCategories: targetType === "category" ? applicableCategories : [],
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      startDate: start,
      endDate: end,
      priority: priority !== undefined ? Number(priority) : 1,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    offer.status = offer.getCalculatedStatus();
    await offer.save();

    const populatedOffer = await Offer.findById(offer._id)
      .populate("applicableProducts", "name price images")
      .populate("applicableCategories", "name image");

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer: populatedOffer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create offer",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Update offer details, schedule, or priority
 */
export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const {
      title,
      description,
      bannerText,
      badgeLabel,
      targetType,
      applicableProducts,
      applicableCategories,
      discountType,
      discountValue,
      maxDiscountAmount,
      startDate,
      endDate,
      priority,
      isActive,
      status,
    } = req.body;

    if (title !== undefined) offer.title = title.trim();
    if (description !== undefined) offer.description = description.trim();
    if (bannerText !== undefined) offer.bannerText = bannerText.trim();
    if (badgeLabel !== undefined) offer.badgeLabel = badgeLabel.trim();

    if (targetType !== undefined) {
      offer.targetType = targetType;
      if (targetType === "product" && Array.isArray(applicableProducts)) {
        offer.applicableProducts = applicableProducts;
        offer.applicableCategories = [];
      } else if (targetType === "category" && Array.isArray(applicableCategories)) {
        offer.applicableCategories = applicableCategories;
        offer.applicableProducts = [];
      } else if (targetType === "sitewide") {
        offer.applicableProducts = [];
        offer.applicableCategories = [];
      }
    } else {
      if (Array.isArray(applicableProducts)) offer.applicableProducts = applicableProducts;
      if (Array.isArray(applicableCategories)) offer.applicableCategories = applicableCategories;
    }

    if (discountType !== undefined) offer.discountType = discountType;
    if (discountValue !== undefined) offer.discountValue = Number(discountValue);
    if (maxDiscountAmount !== undefined) {
      offer.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    }

    if (startDate !== undefined) offer.startDate = new Date(startDate);
    if (endDate !== undefined) offer.endDate = new Date(endDate);

    if (offer.endDate <= offer.startDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be chronologically after the start date",
      });
    }

    if (priority !== undefined) offer.priority = Number(priority);
    if (isActive !== undefined) offer.isActive = Boolean(isActive);

    // Recompute status
    offer.status = offer.getCalculatedStatus();
    if (status && ["disabled", "expired"].includes(status)) {
      offer.status = status;
    }

    await offer.save();

    const updatedOffer = await Offer.findById(offer._id)
      .populate("applicableProducts", "name price images")
      .populate("applicableCategories", "name image");

    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update offer",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Delete offer
 */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete offer",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Toggle Offer Active State
 */
export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    offer.isActive = !offer.isActive;
    offer.status = offer.getCalculatedStatus();
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer ${offer.isActive ? "activated" : "deactivated"} successfully`,
      offer,
    });
  } catch (error) {
    console.error("Error toggling offer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle offer status",
      error: error.message,
    });
  }
};

/**
 * PUBLIC: Get active public offers for homepage banner, marquee, and store displays
 */
export const getActivePublicOffers = async (req, res) => {
  try {
    await syncOfferStatuses();

    const now = new Date();
    const activeOffers = await Offer.find({
      isActive: true,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ priority: -1, createdAt: -1 })
      .populate("applicableCategories", "name image")
      .populate("applicableProducts", "name price images discountPrice");

    res.status(200).json({
      success: true,
      count: activeOffers.length,
      offers: activeOffers,
    });
  } catch (error) {
    console.error("Error fetching active public offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active offers",
      error: error.message,
    });
  }
};
