import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

import { emitHomepageUpdate, emitCategoryUpdate } from "../socket/socketManager.js";

import { getSingleImageUrl } from "../utils/uploadToCloudinary.js";



/*
========================================
GET ALL CATEGORIES
========================================
*/

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      sortOrder: 1,
      createdAt: 1,
    });



    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productsCount = await Product.countDocuments({
          category: category._id,
        });

        return {
          ...category.toObject(),
          productsCount,
        };
      }),
    );

    return res.status(200).json({
      categories: categoriesWithCount,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET CATEGORY BY ID
========================================
*/

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    let category = null;
    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
      category = await Category.findById(id);
    } else {
      const cleanName = String(id).replace(/-/g, " ").trim();
      category = await Category.findOne({
        name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      });
    }

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const productsCount = await Product.countDocuments({
      category: category._id,
    });

    return res.status(200).json({
      category: {
        ...category.toObject(),
        productsCount,
      },
    });
  } catch (error) {
    console.error("Get Category Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
CREATE CATEGORY
========================================
*/

const createCategory = async (req, res) => {
  try {
    const { name, subcategory, isActive } = req.body;

    /*
    VALIDATION
    */

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const trimmedName = name.trim();

    /*
    GET LAST ORDER
    */

    const lastCategory = await Category.findOne().sort({
      sortOrder: -1,
    });

    const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 1;

    /*
    UPLOAD IMAGE
    */

    const imageUrl = await getSingleImageUrl(req.file, "categories");

    /*
    CREATE
    */

    const category = await Category.create({
      name: trimmedName,
      subcategory: (subcategory || "").trim(),
      isActive:
        isActive === undefined
          ? true
          : isActive === true || isActive === "true",
      image: imageUrl,
      sortOrder,
    });

    /*
    REALTIME UPDATE
    */

    emitCategoryUpdate("category_created", category);

    emitHomepageUpdate("category_created", {
      categoryId: category._id,
      category,
    });

    /*
    RESPONSE
    */

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
UPDATE CATEGORY
========================================
*/

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    FIND CATEGORY
    */

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const { name, subcategory, isActive, existingImage } = req.body;

    /*
    UPDATE NAME
    */

    if (name !== undefined && name.trim()) {
      category.name = name.trim();
    }

    /*
    UPDATE SUBCATEGORY
    */

    if (subcategory !== undefined) {
      category.subcategory = (subcategory || "").trim();
    }

    /*
    UPDATE ACTIVE STATUS
    */

    if (isActive !== undefined) {
      category.isActive = isActive === true || isActive === "true";
    }

    /*
    UPDATE IMAGE
    */

    if (req.file) {
      category.image = await getSingleImageUrl(req.file, "categories");
    } else if (existingImage !== undefined) {
      category.image = existingImage;
    }

    /*
    SAVE
    */

    await category.save();

    /*
    REALTIME UPDATE
    */

    emitCategoryUpdate("category_updated", category);

    emitHomepageUpdate("category_updated", {
      categoryId: category._id,
      category,
    });

    /*
    RESPONSE
    */

    return res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update Category Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
DELETE CATEGORY
========================================
*/

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    /*
    CHECK PRODUCTS
    */

    const productsCount = await Product.countDocuments({
      category: id,
    });

    if (productsCount > 0) {
      return res.status(400).json({
        message: "Cannot delete category with products",
      });
    }

    /*
    DELETE
    */

    await Category.findByIdAndDelete(id);

    /*
    REALTIME UPDATE
    */

    emitCategoryUpdate("category_deleted", { categoryId: id });

    emitHomepageUpdate("category_deleted", {
      categoryId: id,
    });

    /*
    RESPONSE
    */

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
REORDER CATEGORY
========================================
*/

const reorderCategory = async (req, res) => {
  try {
    const { categoryId, direction } = req.body;

    /*
    VALIDATION
    */

    if (!categoryId || !["up", "down"].includes(direction)) {
      return res.status(400).json({
        message: "Category ID and valid direction are required",
      });
    }

    /*
    GET CATEGORIES
    */

    const categories = await Category.find().sort({
      sortOrder: 1,
      createdAt: 1,
    });

    /*
    CURRENT INDEX
    */

    const currentIndex = categories.findIndex(
      (category) => category._id.toString() === categoryId,
    );

    if (currentIndex === -1) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    /*
    TARGET INDEX
    */

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    /*
    BOUNDARY
    */

    if (targetIndex < 0 || targetIndex >= categories.length) {
      return res.status(400).json({
        message:
          direction === "up"
            ? "Category is already at the top"
            : "Category is already at the bottom",
      });
    }

    /*
    NORMALIZE ORDER
    */

    categories.forEach((category, index) => {
      category.sortOrder = index + 1;
    });

    /*
    SWAP
    */

    const currentCategory = categories[currentIndex];

    const targetCategory = categories[targetIndex];

    const currentOrder = currentCategory.sortOrder;

    currentCategory.sortOrder = targetCategory.sortOrder;

    targetCategory.sortOrder = currentOrder;

    /*
    SAVE
    */

    await Promise.all(categories.map((category) => category.save()));

    /*
    REALTIME UPDATE
    */

    emitCategoryUpdate("category_reordered", {
      categoryId,
      direction,
    });

    emitHomepageUpdate("category_reordered", {
      categoryId,
      direction,
    });

    /*
    GET UPDATED DATA
    */

    const updatedCategories = await Category.find().sort({
      sortOrder: 1,
      createdAt: 1,
    });

    /*
    RESPONSE
    */

    return res.status(200).json({
      message: "Category order updated successfully",

      categories: updatedCategories,
    });
  } catch (error) {
    console.error("Reorder Category Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
EXPORT
========================================
*/

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategory,
};
