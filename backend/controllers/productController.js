import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { emitHomepageUpdate, emitProductUpdate } from "../socket/socketManager.js";

import { getMultipleImageUrls } from "../utils/uploadToCloudinary.js";

/*
========================================
HELPER
NORMALIZE ARRAY DATA
========================================
*/

const normalizeArray = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  /*
  ALREADY ARRAY
  */

  if (Array.isArray(value)) {
    return [
      ...new Set(value.map((item) => String(item).trim()).filter(Boolean)),
    ];
  }

  /*
  STRING
  */

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    /*
    JSON ARRAY
    */

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        return [
          ...new Set(
            parsedValue.map((item) => String(item).trim()).filter(Boolean),
          ),
        ];
      }
    } catch (error) {
      // Not JSON
    }

    /*
    COMMA SEPARATED
    */

    return [
      ...new Set(
        trimmedValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

const toScalar = (value, defaultValue = undefined) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : defaultValue;
  }
  return value;
};

/*
========================================
CREATE PRODUCT
========================================
*/

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      discountPercent,
      review,
      onSale,
      category,
      categories,
      stock,
      brand,
      gender,
      size,
      color,
    } = req.body;

    /*
    CATEGORIES
    */
    const categoryList = normalizeArray(categories || category);

    const pName = toScalar(name);
    const pDescription = toScalar(description);
    const pPrice = toScalar(price);
    const pDiscountPrice = toScalar(discountPrice, 0);
    const pDiscountPercent = toScalar(discountPercent, 0);
    const pReview = toScalar(review, 0);
    const pOnSale = toScalar(onSale);
    const isOnSale = pOnSale === true || pOnSale === "true";
    const pStock = toScalar(stock, 0);
    const pBrand = toScalar(brand, "Decathlon");
    const pGender = toScalar(gender, "Unisex");

    /*
    VALIDATION
    */

    if (!pName || !pDescription || pPrice === undefined || categoryList.length === 0) {
      return res.status(400).json({
        message:
          "Name, description, price and at least one category are required",
      });
    }

    /*
    IMAGES
    */

    const images = await getMultipleImageUrls(req.files, "products");

    /*
    SIZE
    */

    const productSize = normalizeArray(size);

    /*
    COLOR
    */

    const productColor = normalizeArray(color);

    /*
    CREATE PRODUCT
    */

    const product = await Product.create({
      name: String(pName).trim(),
      description: String(pDescription).trim(),
      price: Number(pPrice),
      discountPrice: Number(pDiscountPrice || 0),
      discountPercent: Number(pDiscountPercent || 0),
      review: Number(pReview || 0),
      onSale: isOnSale,
      category: categoryList[0],
      categories: categoryList,
      images,
      stock: Number(pStock || 0),
      brand: String(pBrand || "Decathlon").trim(),
      gender: String(pGender || "Unisex").trim(),
      size: productSize,
      color: productColor,
    });

    /*
    REALTIME UPDATE
    */

    emitProductUpdate("product_created", product);

    emitHomepageUpdate("product_created", {
      productId: product._id,
      categoryId: product.category,
      categories: product.categories,
      product,
    });

    /*
    RESPONSE
    */

    return res.status(201).json({
      message: "Product created successfully",

      product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET PRODUCTS
========================================
*/

const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      brand,
      size,
      color,
      sort,
      page = 1,
      limit = 12,
      admin,
    } = req.query;

    /*
    FILTER
    */

    const filter = {};

    /*
    ACTIVE PRODUCTS
    */

    if (admin !== "true") {
      filter.isActive = true;
    }

    /*
    SEARCH
    */

    if (search) {
      const searchRegex = {
        $regex: search,
        $options: "i",
      };

      const searchConditions = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    /*
    CATEGORY
    */

    /*
    CATEGORY
    */

    if (category) {
      let categoryConditions = [];
      if (mongoose.Types.ObjectId.isValid(category)) {
        const catObjId = new mongoose.Types.ObjectId(category);
        const catDoc = await Category.findById(catObjId).select("name slug");
        if (
          catDoc &&
          (catDoc.slug === "running" || catDoc.name?.toLowerCase() === "running")
        ) {
          const relatedCats = await Category.find({
            $or: [
              { _id: catObjId },
              { slug: /^running-/i },
              { name: /^running /i },
            ],
          }).select("_id");
          const relatedIds = relatedCats.map((c) => c._id);
          categoryConditions = [
            { category: { $in: relatedIds } },
            { categories: { $in: relatedIds } },
          ];
        } else {
          categoryConditions = [
            { category: catObjId },
            { categories: catObjId },
          ];
        }
      } else {
        const cleanSlug = String(category).toLowerCase().trim();
        const cleanName = String(category).replace(/-/g, " ").trim();
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Look up exact category by slug or exact name
        const matchedCategories = await Category.find({
          $or: [
            { slug: cleanSlug },
            { name: { $regex: `^${escapedName}$`, $options: "i" } },
            { name: cleanName },
            ...(cleanSlug === "running" || cleanName.toLowerCase() === "running"
              ? [
                  { slug: /^running-/i },
                  { name: /^running /i },
                ]
              : []),
          ],
        }).select("_id");

        const matchedIds = matchedCategories.map((c) => c._id);

        if (matchedIds.length > 0) {
          categoryConditions = [
            { category: { $in: matchedIds } },
            { categories: { $in: matchedIds } },
          ];
        } else {
          // Only fallback to title regex if no category exists in DB with that name
          filter.name = { $regex: cleanName, $options: "i" };
        }
      }

      if (categoryConditions.length > 0) {
        if (filter.$or) {
          filter.$and = (filter.$and || []).concat([
            { $or: filter.$or },
            { $or: categoryConditions },
          ]);
          delete filter.$or;
        } else {
          filter.$or = categoryConditions;
        }
      }
    }

    /*
    BRAND
    */

    if (brand) {
      filter.brand = {
        $regex: brand,
        $options: "i",
      };
    }

    /*
    SIZE
    */

    if (size) {
      filter.size = size;
    }

    /*
    COLOR
    */

    if (color) {
      filter.color = color;
    }

    /*
    PRICE
    */

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      if (minPrice !== undefined && minPrice !== "") {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        filter.price.$lte = Number(maxPrice);
      }
    }

    /*
    PAGINATION
    */

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.max(Number(limit) || 12, 1);

    const skip = (pageNumber - 1) * limitNumber;

    /*
    SORT
    */

    let sortOption = {
      createdAt: -1,
    };

    if (sort === "price_low") {
      sortOption = {
        price: 1,
      };
    }

    if (sort === "price_high") {
      sortOption = {
        price: -1,
      };
    }

    if (sort === "newest") {
      sortOption = {
        createdAt: -1,
      };
    }

    if (sort === "name_asc") {
      sortOption = {
        name: 1,
      };
    }

    if (sort === "name_desc") {
      sortOption = {
        name: -1,
      };
    }

    /*
    TOTAL
    */

    const totalProducts = await Product.countDocuments(filter);

    /*
    PRODUCTS
    */

    const products = await Product.find(filter)
      .populate("category", "name image")
      .populate("categories", "name image")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    /*
    TOTAL PAGES
    */

    const totalPages = Math.ceil(totalProducts / limitNumber);

    /*
    RESPONSE
    */

    return res.status(200).json({
      totalProducts,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET PRODUCT BY ID
========================================
*/

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate("category", "name image")
      .populate("categories", "name image");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
UPDATE PRODUCT
========================================
*/

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    FIND PRODUCT
    */

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    /*
    REQUEST DATA
    */

    const {
      name,
      description,
      price,
      discountPrice,
      discountPercent,
      review,
      onSale,
      category,
      categories,
      stock,
      brand,
      gender,
      size,
      color,
      isActive,
      existingImages,
    } = req.body;

    /*
    OLD CATEGORY
    */

    const oldCategory = product.category;

    /*
    BASIC FIELDS
    */

    if (name !== undefined) {
      product.name = String(toScalar(name, product.name)).trim();
    }

    if (description !== undefined) {
      product.description = String(toScalar(description, product.description)).trim();
    }

    if (price !== undefined) {
      product.price = Number(toScalar(price, product.price));
    }

    if (discountPrice !== undefined) {
      product.discountPrice = Number(toScalar(discountPrice, 0));
    }

    if (discountPercent !== undefined) {
      product.discountPercent = Number(toScalar(discountPercent, 0));
    }

    if (review !== undefined) {
      product.review = Number(toScalar(review, 0));
    }

    if (onSale !== undefined) {
      const saleVal = toScalar(onSale);
      product.onSale = saleVal === true || saleVal === "true";
    }

    if (categories !== undefined || category !== undefined) {
      const catList = normalizeArray(categories || category);
      if (catList.length > 0) {
        product.categories = catList;
        product.category = catList[0];
      }
    }

    if (stock !== undefined) {
      product.stock = Number(toScalar(stock, 0));
    }

    if (brand !== undefined) {
      product.brand = String(toScalar(brand, "Decathlon")).trim();
    }

    if (gender !== undefined) {
      product.gender = String(toScalar(gender, "Unisex")).trim();
    }

    /*
    SIZE
    */

    if (size !== undefined) {
      product.size = normalizeArray(size);
    }

    /*
    COLOR
    */

    if (color !== undefined) {
      product.color = normalizeArray(color);
    }

    /*
    ACTIVE STATUS
    */

    if (isActive !== undefined) {
      const activeVal = toScalar(isActive);
      product.isActive = activeVal === true || activeVal === "true";
    }

    /*
    ========================================
    EXISTING IMAGES
    ========================================
    */

    let remainingImages = product.images || [];

    if (existingImages !== undefined) {
      try {
        if (typeof existingImages === "string") {
          if (existingImages.trim() === "") {
            remainingImages = [];
          } else {
            remainingImages = JSON.parse(existingImages);
          }
        } else {
          remainingImages = existingImages;
        }

        if (!Array.isArray(remainingImages)) {
          remainingImages = [];
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid existingImages data",
        });
      }
    }

    /*
    ========================================
    NEW IMAGES
    ========================================
    */

    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} new image(s)...`);

      const newImages = await getMultipleImageUrls(req.files, "products");

      remainingImages = [...remainingImages, ...newImages];
    }

    /*
    ========================================
    SAVE IMAGES
    ========================================
    */

    product.images = remainingImages;

    /*
    ========================================
    SAVE PRODUCT
    ========================================
    */

    await product.save();

    /*
    ========================================
    REALTIME UPDATE
    ========================================
    */

    emitProductUpdate("product_updated", product);

    emitHomepageUpdate("product_updated", {
      productId: product._id,
      categoryId: product.category,
      oldCategoryId: oldCategory,
      isActive: product.isActive,
      product,
    });

    /*
    ========================================
    RESPONSE
    ========================================
    */

    return res.status(200).json({
      message: "Product updated successfully",

      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
DELETE PRODUCT
========================================
*/

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const categoryId = product.category;

    await Product.findByIdAndDelete(id);

    /*
    REALTIME UPDATE
    */

    emitProductUpdate("product_deleted", {
      _id: id,
      productId: id,
      categoryId,
    });

    emitHomepageUpdate("product_deleted", {
      productId: id,
      categoryId,
    });

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);

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
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
