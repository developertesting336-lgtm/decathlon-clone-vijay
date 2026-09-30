import mongoose from "mongoose";
import SizeGuide from "../models/SizeGuide.js";
import Category from "../models/Category.js";

/**
 * GET ALL SIZE GUIDES
 * GET /size-guides or /api/size-guides
 * Public (active only) / Admin (all)
 */
export const getSizeGuides = async (req, res) => {
  try {
    const filter = {};
    if (req.query.all !== "true" && req.user?.role !== "admin") {
      filter.isActive = true;
    }
    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    const sizeGuides = await SizeGuide.find(filter)
      .populate("category", "name image subcategory")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sizeGuides.length,
      sizeGuides,
    });
  } catch (error) {
    console.error("Get Size Guides Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch size guides",
    });
  }
};

/**
 * GET SIZE GUIDE BY ID
 * GET /size-guides/:id or /api/size-guides/:id
 * Public
 */
export const getSizeGuideById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size guide ID",
      });
    }

    const sizeGuide = await SizeGuide.findById(id).populate(
      "category",
      "name image subcategory"
    );

    if (!sizeGuide) {
      return res.status(404).json({
        success: false,
        message: "Size guide not found",
      });
    }

    return res.status(200).json({
      success: true,
      sizeGuide,
    });
  } catch (error) {
    console.error("Get Size Guide By Id Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch size guide",
    });
  }
};

/**
 * GET SIZE GUIDE BY CATEGORY ID
 * GET /size-guides/category/:categoryId or /api/size-guides/category/:categoryId
 * Optional query: ?gender=Men / Women / Kids / Unisex
 * Public
 */
export const getSizeGuideByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const gender = req.query.gender;

    let sizeGuide = null;

    if (gender) {
      // 1. Try exact gender match
      sizeGuide = await SizeGuide.findOne({
        category: categoryId,
        gender: new RegExp(`^${gender}$`, "i"),
        isActive: true,
      }).populate("category", "name image subcategory");

      // 2. If not found, try Unisex or All
      if (!sizeGuide) {
        sizeGuide = await SizeGuide.findOne({
          category: categoryId,
          gender: { $in: ["Unisex", "All"] },
          isActive: true,
        }).populate("category", "name image subcategory");
      }
    }

    // 3. If still not found, get any active guide for this category
    if (!sizeGuide) {
      sizeGuide = await SizeGuide.findOne({
        category: categoryId,
        isActive: true,
      }).populate("category", "name image subcategory");
    }

    if (!sizeGuide) {
      return res.status(404).json({
        success: false,
        message: "Size guide not found for this category",
      });
    }

    return res.status(200).json({
      success: true,
      sizeGuide,
    });
  } catch (error) {
    console.error("Get Size Guide By Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch size guide for category",
    });
  }
};

/**
 * CREATE SIZE GUIDE
 * POST /size-guides or /api/size-guides
 * Admin Only
 */
export const createSizeGuide = async (req, res) => {
  try {
    const { name, category, gender, measurements, description, isActive } =
      req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Size guide name is required",
      });
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check duplicate category & gender combination
      const duplicate = await SizeGuide.findOne({
        category,
        gender: gender || "Unisex",
        isActive: true,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `A size guide for this category and gender (${gender || "Unisex"}) already exists`,
          existingGuideId: duplicate._id,
        });
      }
    }

    if (
      !measurements ||
      !Array.isArray(measurements) ||
      measurements.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Measurements must be a non-empty array with size entries",
      });
    }

    // Validate measurement items
    for (const m of measurements) {
      if (!m.size || !String(m.size).trim()) {
        return res.status(400).json({
          success: false,
          message: "Each measurement entry must have a size (e.g. S, M, L or 42)",
        });
      }
    }

    const sizeGuide = await SizeGuide.create({
      name: String(name).trim(),
      category: category || null,
      gender: gender || "Unisex",
      description: String(description || "").trim(),
      measurements,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    if (sizeGuide.category) {
      await sizeGuide.populate("category", "name image subcategory");
    }

    return res.status(201).json({
      success: true,
      message: "Size guide created successfully",
      sizeGuide,
    });
  } catch (error) {
    console.error("Create Size Guide Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create size guide",
    });
  }
};

/**
 * UPDATE SIZE GUIDE
 * PUT /size-guides/:id or /api/size-guides/:id
 * Admin Only
 */
export const updateSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size guide ID",
      });
    }

    const sizeGuide = await SizeGuide.findById(id);
    if (!sizeGuide) {
      return res.status(404).json({
        success: false,
        message: "Size guide not found",
      });
    }

    const { name, category, gender, measurements, description, isActive } =
      req.body;

    if (name !== undefined) {
      sizeGuide.name = String(name).trim();
    }

    if (category !== undefined) {
      if (category) {
        if (!mongoose.Types.ObjectId.isValid(category)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }
        const catExists = await Category.findById(category);
        if (!catExists) {
          return res.status(404).json({
            success: false,
            message: "Category not found",
          });
        }
        sizeGuide.category = category;
      } else {
        sizeGuide.category = null;
      }
    }

    if (gender !== undefined) {
      sizeGuide.gender = gender;
    }

    if (description !== undefined) {
      sizeGuide.description = String(description).trim();
    }

    if (measurements !== undefined) {
      if (!Array.isArray(measurements) || measurements.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Measurements must be a non-empty array",
        });
      }
      for (const m of measurements) {
        if (!m.size || !String(m.size).trim()) {
          return res.status(400).json({
            success: false,
            message: "Each measurement entry must have a size",
          });
        }
      }
      sizeGuide.measurements = measurements;
    }

    if (isActive !== undefined) {
      sizeGuide.isActive = Boolean(isActive);
    }

    await sizeGuide.save();

    if (sizeGuide.category) {
      await sizeGuide.populate("category", "name image subcategory");
    }

    return res.status(200).json({
      success: true,
      message: "Size guide updated successfully",
      sizeGuide,
    });
  } catch (error) {
    console.error("Update Size Guide Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update size guide",
    });
  }
};

/**
 * DELETE SIZE GUIDE
 * DELETE /size-guides/:id or /api/size-guides/:id
 * Admin Only
 */
export const deleteSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size guide ID",
      });
    }

    const sizeGuide = await SizeGuide.findByIdAndDelete(id);
    if (!sizeGuide) {
      return res.status(404).json({
        success: false,
        message: "Size guide not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Size guide deleted successfully",
    });
  } catch (error) {
    console.error("Delete Size Guide Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete size guide",
    });
  }
};
