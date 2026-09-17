import AiKnowledge from "../models/AiKnowledge.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

// Helper: safely escape special characters for regex searching
function escapeRegex(text = "") {
  return text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper: parse keywords from array or comma-separated string into clean lowercase array
function parseKeywords(keywords = []) {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  }
  return String(keywords)
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

// GET /api/ai/knowledge - List knowledge items with optional category, status, and search filters
export const getKnowledgeList = async (req, res) => {
  try {
    const { category, search, activeOnly, status } = req.query;
    const filter = {};

    // Filter by Category
    if (category && category !== "all") {
      filter.category = category;
    }

    // Filter by Active/Inactive Status
    if (status === "active" || activeOnly === "true") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    // Filter by Search text (Topic, Keywords, or Answer)
    if (search) {
      filter.$or = [
        { topic: { $regex: search, $options: "i" } },
        { keywords: { $in: [new RegExp(search, "i")] } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const items = await AiKnowledge.find(filter).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("getKnowledgeList error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AI knowledge items",
      error: err.message,
    });
  }
};

// GET /api/ai/knowledge/:id - Fetch single knowledge item by ID
export const getKnowledgeById = async (req, res) => {
  try {
    const item = await AiKnowledge.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Knowledge item not found" });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ai/knowledge - Add new knowledge item
export const createKnowledge = async (req, res) => {
  try {
    const { topic, category = "general", keywords = [], answer, isActive = true } = req.body;

    if (!topic?.trim() || !answer?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Topic and answer are required",
      });
    }

    // Prevent duplicate topics (case-insensitive)
    const existing = await AiKnowledge.findOne({
      topic: { $regex: new RegExp(`^${escapeRegex(topic)}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A knowledge entry with the topic "${topic.trim()}" already exists in "${existing.category}" category.`,
      });
    }

    const doc = await AiKnowledge.create({
      topic: topic.trim(),
      category,
      keywords: parseKeywords(keywords),
      answer: answer.trim(),
      isActive: Boolean(isActive),
    });

    return res.status(201).json({
      success: true,
      message: "Knowledge item created successfully",
      data: doc,
    });
  } catch (err) {
    console.error("createKnowledge error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create knowledge item",
      error: err.message,
    });
  }
};

// PUT /api/ai/knowledge/:id - Update existing knowledge item
export const updateKnowledge = async (req, res) => {
  try {
    const { topic, category, keywords, answer, isActive } = req.body;
    const doc = await AiKnowledge.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Knowledge item not found" });
    }

    // Check duplicate topic if topic was changed
    if (topic !== undefined) {
      const trimmedTopic = topic.trim();
      if (trimmedTopic.toLowerCase() !== doc.topic.toLowerCase()) {
        const existing = await AiKnowledge.findOne({
          _id: { $ne: req.params.id },
          topic: { $regex: new RegExp(`^${escapeRegex(trimmedTopic)}$`, "i") },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Another knowledge entry with the topic "${trimmedTopic}" already exists.`,
          });
        }
      }
      doc.topic = trimmedTopic;
    }

    if (category !== undefined) doc.category = category;
    if (answer !== undefined) doc.answer = answer.trim();
    if (isActive !== undefined) doc.isActive = Boolean(isActive);
    if (keywords !== undefined) doc.keywords = parseKeywords(keywords);

    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Knowledge item updated successfully",
      data: doc,
    });
  } catch (err) {
    console.error("updateKnowledge error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update knowledge item",
      error: err.message,
    });
  }
};

// DELETE /api/ai/knowledge/:id - Delete dynamic AI knowledge document
export const deleteKnowledge = async (req, res) => {
  try {
    const doc = await AiKnowledge.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Knowledge item not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Knowledge item deleted successfully"
    });
  } catch (err) {
    console.error("deleteKnowledge error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete knowledge item",
      error: err.message
    });
  }
};

// GET /api/ai/stats - Live dynamic database statistics
export const getAiLiveStats = async (req, res) => {
  try {
    const [totalProducts, inStockProducts, totalCategories, brands, knowledgeCount, priceStats] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: { $gt: 0 } }),
      Category.countDocuments({ isActive: true }),
      Product.distinct("brand", { isActive: true }),
      AiKnowledge.countDocuments({ isActive: true }),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
            avgPrice: { $avg: "$price" }
          }
        }
      ])
    ]);

    const stats = {
      totalProducts,
      inStockProducts,
      totalCategories,
      brandsCount: brands.filter(Boolean).length,
      topBrands: brands.filter(Boolean).slice(0, 10),
      knowledgeCount,
      minPrice: priceStats[0]?.minPrice || 0,
      maxPrice: priceStats[0]?.maxPrice || 0,
      avgPrice: Math.round(priceStats[0]?.avgPrice || 0)
    };

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    console.error("getAiLiveStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch live stats",
      error: err.message
    });
  }
};
