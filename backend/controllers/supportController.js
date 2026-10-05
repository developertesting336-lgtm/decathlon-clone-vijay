import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import SupportCategory from "../models/SupportCategory.js";
import SupportFAQ from "../models/SupportFAQ.js";

// Escape string for safe RegExp query
const escapeRegex = (string) => {
  return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/*
==================================================
CATEGORY CONTROLLER FUNCTIONS
==================================================
*/

/**
 * GET /api/support/categories
 * Public & Admin: Get categories (customers get active only; admins get all)
 */
export const getCategories = async (req, res) => {
  try {
    const { all } = req.query;
    let isAdmin = all === "true" || all === "1";
    if (!isAdmin && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        if (decoded && (decoded.role === "admin" || decoded.isAdmin)) {
          isAdmin = true;
        }
      } catch (e) {}
    }

    const filter = isAdmin ? {} : { isActive: true };
    const categories = await SupportCategory.find(filter)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    // Include FAQ counts for each category
    const categoryIds = categories.map((c) => c._id);
    const faqCounts = await SupportFAQ.aggregate([
      { $match: { category: { $in: categoryIds }, ...(isAdmin ? {} : { isActive: true }) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    faqCounts.forEach((item) => {
      countMap.set(String(item._id), item.count);
    });

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      faqCount: countMap.get(String(cat._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      count: enrichedCategories.length,
      categories: enrichedCategories,
    });
  } catch (error) {
    console.error("Error fetching support categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support categories",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/categories/admin
 * Admin: Get all categories (active & inactive) with total FAQ counts
 */
export const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await SupportCategory.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const categoryIds = categories.map((c) => c._id);
    const faqCounts = await SupportFAQ.aggregate([
      { $match: { category: { $in: categoryIds } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    faqCounts.forEach((item) => {
      countMap.set(String(item._id), item.count);
    });

    const enriched = categories.map((cat) => ({
      ...cat,
      faqCount: countMap.get(String(cat._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      categories: enriched,
    });
  } catch (error) {
    console.error("Error fetching admin support categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support categories",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/categories/:categoryId
 * Public: Get a category and its active FAQs by ID (admins can retrieve inactive categories)
 */
export const getCategoryById = async (req, res) => {
  try {
    const id = req.params.categoryId || req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    const category = await SupportCategory.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Support category not found",
      });
    }

    // Check if caller is admin
    let isAdmin = req.query.all === "true";
    if (!isAdmin && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        if (decoded && (decoded.role === "admin" || decoded.isAdmin)) {
          isAdmin = true;
        }
      } catch (e) {}
    }

    if (!category.isActive && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: "Support category not found",
      });
    }

    // Find active FAQs for this category sorted by displayOrder ASC
    const faqFilter = { category: category._id };
    if (!isAdmin) {
      faqFilter.isActive = true;
    }

    const faqs = await SupportFAQ.find(faqFilter)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      category,
      faqs: faqs || [],
    });
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category details",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/faqs/category/:categoryId
 * Public: Get active FAQs for a specific category ID
 */
export const getFaqsByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId || req.params.id;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    const faqs = await SupportFAQ.find({
      category: categoryId,
      isActive: true,
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: faqs.length,
      faqs: faqs || [],
    });
  } catch (error) {
    console.error("Error fetching FAQs by category ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs for category",
      error: error.message,
    });
  }
};

/**
 * POST /api/support/categories
 * Admin: Create a new support category
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, icon, displayOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const newCategory = new SupportCategory({
      name: name.trim(),
      description: description ? description.trim() : "",
      icon: icon ? icon.trim() : "orders",
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Support category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating support category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create support category",
      error: error.message,
    });
  }
};

/**
 * PUT /api/support/categories/:id
 * Admin: Update a support category
 */
export const updateCategory = async (req, res) => {
  try {
    const id = req.params.categoryId || req.params.id;
    const { name, description, icon, displayOrder, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await SupportCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Support category not found",
      });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Support category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating support category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update support category",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/support/categories/:categoryId/status
 * Admin: Toggle or set category active status
 */
export const updateCategoryStatus = async (req, res) => {
  try {
    const id = req.params.categoryId || req.params.id;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await SupportCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Support category not found",
      });
    }

    category.isActive = isActive !== undefined ? Boolean(isActive) : !category.isActive;
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category '${category.name}' status updated to ${category.isActive ? "Active" : "Inactive"}`,
      category,
    });
  } catch (error) {
    console.error("Error updating category status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/support/categories/:categoryId
 * Admin: Delete a support category (with Phase 20 safety check)
 */
export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.categoryId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await SupportCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Support category not found",
      });
    }

    // Phase 20 Delete Safety: Check if FAQs are associated with this category
    const associatedFaqsCount = await SupportFAQ.countDocuments({ category: id });
    if (associatedFaqsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "This category contains FAQs. Please remove or move its FAQs before deleting the category.",
        faqCount: associatedFaqsCount,
      });
    }

    await SupportCategory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Support category '${category.name}' deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting support category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete support category",
      error: error.message,
    });
  }
};

/*
==================================================
FAQ CONTROLLER FUNCTIONS
==================================================
*/

/**
 * GET /api/support/faqs
 * Public & Admin: Get FAQs with filtering, search, and pagination
 */
export const getFaqs = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;

    const filter = {};

    // Filter by category (by ObjectId)
    if (category && category !== "ALL") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      }
    }

    // Filter by status
    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    // Filter by search keyword
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ question: regex }, { answer: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [faqs, total] = await Promise.all([
      SupportFAQ.find(filter)
        .populate("category", "name icon isActive")
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupportFAQ.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      faqs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
      error: error.message,
    });
  }
};

/**
 * GET /api/support/faqs/:faqId
 * Public & Admin: Get single FAQ by ID
 */
export const getFaqById = async (req, res) => {
  try {
    const id = req.params.faqId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await SupportFAQ.findById(id)
      .populate("category", "name icon isActive")
      .lean();

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      faq,
    });
  } catch (error) {
    console.error("Error fetching FAQ by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ",
      error: error.message,
    });
  }
};

/**
 * POST /api/support/faqs
 * Admin: Create a new FAQ
 */
export const createFaq = async (req, res) => {
  try {
    const { category, question, answer, displayOrder, isActive } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer is required",
      });
    }

    // Verify category exists
    const categoryDoc = await SupportCategory.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not exist",
      });
    }

    const newFaq = new SupportFAQ({
      category,
      question: question.trim(),
      answer: answer.trim(),
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await newFaq.save();
    await newFaq.populate("category", "name icon isActive");

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      faq: newFaq,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
      error: error.message,
    });
  }
};

/**
 * PUT /api/support/faqs/:faqId
 * Admin: Update an existing FAQ
 */
export const updateFaq = async (req, res) => {
  try {
    const id = req.params.faqId || req.params.id;
    const { category, question, answer, displayOrder, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await SupportFAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    if (category) {
      const categoryExists = await SupportCategory.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Selected category does not exist",
        });
      }
      faq.category = category;
    }

    if (question) faq.question = question.trim();
    if (answer) faq.answer = answer.trim();
    if (displayOrder !== undefined) faq.displayOrder = Number(displayOrder);
    if (isActive !== undefined) faq.isActive = Boolean(isActive);

    await faq.save();
    await faq.populate("category", "name icon isActive");

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      faq,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/support/faqs/:faqId/status
 * Admin: Toggle or set FAQ active status
 */
export const updateFaqStatus = async (req, res) => {
  try {
    const id = req.params.faqId || req.params.id;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await SupportFAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    faq.isActive = isActive !== undefined ? Boolean(isActive) : !faq.isActive;
    await faq.save();
    await faq.populate("category", "name icon isActive");

    return res.status(200).json({
      success: true,
      message: `FAQ status updated to ${faq.isActive ? "Active" : "Inactive"}`,
      faq,
    });
  } catch (error) {
    console.error("Error updating FAQ status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/support/faqs/:faqId
 * Admin: Delete an FAQ
 */
export const deleteFaq = async (req, res) => {
  try {
    const id = req.params.faqId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
      });
    }

    const faq = await SupportFAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await SupportFAQ.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
      error: error.message,
    });
  }
};

/*
==================================================
PHASE 5: FAQ SEARCH API
==================================================
*/

/**
 * GET /api/support/search?q=refund
 * Public: Search active FAQs across question and answer
 */
export const searchFaqs = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        query: "",
        count: 0,
        results: [],
      });
    }

    const cleanQuery = q.trim();
    const regex = new RegExp(escapeRegex(cleanQuery), "i");

    // Find active categories first to avoid exposing FAQs of inactive categories
    const activeCategories = await SupportCategory.find({ isActive: true })
      .select("_id")
      .lean();
    const activeCategoryIds = activeCategories.map((c) => c._id);

    const results = await SupportFAQ.find({
      isActive: true,
      category: { $in: activeCategoryIds },
      $or: [{ question: regex }, { answer: regex }],
    })
      .populate("category", "name icon")
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      query: cleanQuery,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error searching FAQs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search FAQs",
      error: error.message,
    });
  }
};
