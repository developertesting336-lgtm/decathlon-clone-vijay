import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { emitHomepageUpdate, emitProductUpdate } from "../socket/socketManager.js";
import { checkAndNotifyLowStock } from "../services/notificationService.js";

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
SEARCH HELPERS
========================================
*/

const escapeRegex = (str) => {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Common sports / ecommerce synonyms and associations
const SEARCH_SYNONYMS = {
  bag: ["backpack", "rucksack", "duffle", "duffel", "tote", "pouch", "bag"],
  bags: ["backpack", "backpacks", "rucksack", "rucksacks", "duffle", "duffel", "tote", "bag"],
  backpack: ["bag", "bags", "rucksack", "backpack"],
  backpacks: ["bag", "bags", "rucksack", "rucksacks", "backpack"],
  shoe: ["footwear", "sneaker", "boot", "sandal", "shoe"],
  shoes: ["footwear", "sneakers", "boots", "sandals", "shoes"],
  cycle: ["bike", "bicycle", "cycling", "cycle"],
  cycles: ["bikes", "bicycles", "cycling", "cycles"],
  jacket: ["coat", "windcheater", "fleece", "raincoat", "jacket"],
  jackets: ["coats", "windcheaters", "fleece", "raincoats", "jackets"],
  tshirt: ["t-shirt", "tee", "top", "jersey"],
  "t-shirt": ["tshirt", "tee", "top", "jersey"],
  "t-shirts": ["tshirts", "tees", "tops", "jerseys"],
  tshirts: ["t-shirts", "tees", "tops", "jerseys"],
};

const getWordVariations = (word) => {
  const clean = String(word).toLowerCase().trim();
  if (!clean) return [];

  const variants = new Set([clean]);

  // Handle plural / singular
  if (clean.endsWith("ies") && clean.length > 4) {
    variants.add(clean.slice(0, -3) + "y");
  } else if (clean.endsWith("es") && clean.length > 3) {
    variants.add(clean.slice(0, -2));
    variants.add(clean.slice(0, -1));
  } else if (clean.endsWith("s") && clean.length > 3) {
    variants.add(clean.slice(0, -1));
  } else if (!clean.endsWith("s") && clean.length >= 2) {
    variants.add(clean + "s");
  }

  // Add synonyms if any
  if (SEARCH_SYNONYMS[clean]) {
    SEARCH_SYNONYMS[clean].forEach((s) => variants.add(s));
  }

  return Array.from(variants);
};

const calculateRelevance = (product, cleanQuery, tokens, matchedCategoryIds) => {
  let score = 0;
  const lowerQuery = cleanQuery.toLowerCase();
  const prodName = (product.name || "").toLowerCase().trim();
  const prodDesc = (product.description || "").toLowerCase();
  const prodBrand = (product.brand || "").toLowerCase();
  const prodGender = (product.gender || "").toLowerCase();
  const prodColors = Array.isArray(product.color)
    ? product.color.map((c) => String(c).toLowerCase())
    : [String(product.color || "").toLowerCase()];

  // 1. Exact name match (Highest: 100)
  if (prodName === lowerQuery) {
    score += 100;
  }
  // 2. Name starts with query (80)
  else if (prodName.startsWith(lowerQuery)) {
    score += 80;
  }
  // 3. Name contains full query (60)
  else if (prodName.includes(lowerQuery)) {
    score += 60;
  }

  // 4. Brand match (50)
  if (prodBrand === lowerQuery || prodBrand.startsWith(lowerQuery)) {
    score += 50;
  } else if (prodBrand.includes(lowerQuery)) {
    score += 40;
  }

  // 5. Category match (40)
  const catIdStr = product.category?._id?.toString() || product.category?.toString();
  const catIdsStrList = Array.isArray(product.categories)
    ? product.categories.map((c) => (c?._id ? c._id.toString() : c.toString()))
    : [];
  const matchesCat = matchedCategoryIds.some(
    (id) => id.toString() === catIdStr || catIdsStrList.includes(id.toString())
  );
  if (matchesCat) {
    score += 40;
  }

  // 6. Name contains tokens (up to 30)
  if (tokens.length > 0) {
    let tokenMatchesInName = 0;
    tokens.forEach((t) => {
      const tLower = t.toLowerCase();
      const tSingular =
        tLower.endsWith("s") && tLower.length > 3 ? tLower.slice(0, -1) : tLower;
      if (prodName.includes(tLower) || prodName.includes(tSingular)) {
        tokenMatchesInName++;
      }
    });
    score += Math.round((tokenMatchesInName / tokens.length) * 30);
  }

  // 7. Description contains query or tokens (20)
  if (prodDesc.includes(lowerQuery)) {
    score += 20;
  } else if (tokens.some((t) => prodDesc.includes(t.toLowerCase()))) {
    score += 10;
  }

  // 8. Color or Gender match (15)
  if (
    prodColors.some(
      (c) =>
        c.includes(lowerQuery) || tokens.some((t) => c.includes(t.toLowerCase()))
    )
  ) {
    score += 15;
  }
  if (prodGender === lowerQuery) {
    score += 15;
  }

  return score;
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
    SEARCH & QUERY INTERPRETATION
    */

    let matchedCategoryIds = [];
    let matchedCategoryDocs = [];
    const isSearching = Boolean(search && String(search).trim());
    let cleanSearch = "";
    let searchTokens = [];
    let detectedGender = null;
    let detectedColor = null;
    let detectedBrand = null;
    let remainingQuery = "";

    if (isSearching) {
      // 1. Normalize input (trim, normalize quotes and apostrophes)
      cleanSearch = String(search)
        .trim()
        .replace(/[’‘`]/g, "'");
      let normalizedQuery = cleanSearch.toLowerCase();

      // 2. Gender Detection & Extraction (mandatory hard filter)
      const WOMEN_REGEX = /\b(women's|womens|women|woman|female|ladies)\b/i;
      const MEN_REGEX = /\b(men's|mens|men|man|male)\b/i;
      const KIDS_REGEX = /\b(kid's|kids|kid|children's|children|junior|boy's|boys|girl's|girls)\b/i;
      const UNISEX_REGEX = /\b(unisex)\b/i;

      // Check Women before Men to avoid substring confusion
      if (WOMEN_REGEX.test(normalizedQuery)) {
        detectedGender = "Women";
        normalizedQuery = normalizedQuery.replace(WOMEN_REGEX, " ").replace(/\s+/g, " ").trim();
      } else if (MEN_REGEX.test(normalizedQuery)) {
        detectedGender = "Men";
        normalizedQuery = normalizedQuery.replace(MEN_REGEX, " ").replace(/\s+/g, " ").trim();
      } else if (KIDS_REGEX.test(normalizedQuery)) {
        detectedGender = "Kids";
        normalizedQuery = normalizedQuery.replace(KIDS_REGEX, " ").replace(/\s+/g, " ").trim();
      } else if (UNISEX_REGEX.test(normalizedQuery)) {
        detectedGender = "Unisex";
        normalizedQuery = normalizedQuery.replace(UNISEX_REGEX, " ").replace(/\s+/g, " ").trim();
      }

      if (detectedGender) {
        filter.gender = detectedGender;
      }

      // 3. Color Detection & Extraction
      const KNOWN_COLORS = [
        "black", "white", "blue", "red", "green", "grey", "gray",
        "orange", "yellow", "pink", "purple", "khaki", "brown", "navy", "beige"
      ];

      for (const col of KNOWN_COLORS) {
        const colRegex = new RegExp(`\\b${col}\\b`, "i");
        if (colRegex.test(normalizedQuery)) {
          detectedColor = col.charAt(0).toUpperCase() + col.slice(1);
          const withoutColor = normalizedQuery.replace(colRegex, " ").replace(/\s+/g, " ").trim();
          if (withoutColor.length > 0 || detectedGender) {
            normalizedQuery = withoutColor;
            filter.color = { $regex: `^${col}$`, $options: "i" };
          }
          break;
        }
      }

      // 4. Brand Detection & Extraction
      const KNOWN_BRANDS = [
        "nike", "adidas", "puma", "reebok", "asics", "under armour",
        "decathlon", "quechua", "domyos", "kiprun", "kipsta", "inesis",
        "caperlan", "tribord", "corength", "rockrider", "kalenji", "btwin",
        "nabaiji", "forclaz", "fouganza", "tarmak", "kuikma", "artengo", "simond"
      ];

      for (const br of KNOWN_BRANDS) {
        const brRegex = new RegExp(`\\b${escapeRegex(br)}\\b`, "i");
        if (brRegex.test(normalizedQuery)) {
          detectedBrand = br.charAt(0).toUpperCase() + br.slice(1);
          const withoutBrand = normalizedQuery.replace(brRegex, " ").replace(/\s+/g, " ").trim();
          if (withoutBrand.length > 0 || detectedGender || detectedColor) {
            normalizedQuery = withoutBrand;
            filter.brand = { $regex: escapeRegex(br), $options: "i" };
          } else {
            filter.brand = { $regex: escapeRegex(br), $options: "i" };
          }
          break;
        }
      }

      remainingQuery = normalizedQuery.trim();

      // 5. Search on remaining query
      if (remainingQuery.length > 0) {
        searchTokens = remainingQuery
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean);

        const allSearchVariants = new Set();
        getWordVariations(remainingQuery).forEach((v) => allSearchVariants.add(v));
        searchTokens.forEach((tok) => {
          getWordVariations(tok).forEach((v) => allSearchVariants.add(v));
        });

        const variantList = Array.from(allSearchVariants);

        // Dynamic Category Lookup on remaining query & variants
        const categoryConditions = [];
        variantList.forEach((variant) => {
          const esc = escapeRegex(variant);
          if (variant.length <= 4) {
            categoryConditions.push({ name: { $regex: `\\b${esc}(s)?\\b`, $options: "i" } });
            categoryConditions.push({ slug: { $regex: `(^|-)${esc}(s)?(-|$)`, $options: "i" } });
          } else {
            categoryConditions.push({ name: { $regex: esc, $options: "i" } });
            categoryConditions.push({ slug: { $regex: esc, $options: "i" } });
          }
        });

        if (categoryConditions.length > 0) {
          matchedCategoryDocs = await Category.find({
            $or: categoryConditions,
            isActive: true,
          }).select("_id name slug image");

          // Exclude categories of conflicting gender
          if (detectedGender === "Men") {
            matchedCategoryDocs = matchedCategoryDocs.filter(
              (c) => !/\bwomen\b/i.test(c.name)
            );
          } else if (detectedGender === "Women") {
            matchedCategoryDocs = matchedCategoryDocs.filter(
              (c) => !/\bmen\b/i.test(c.name) || /\bwomen\b/i.test(c.name)
            );
          }

          matchedCategoryIds = matchedCategoryDocs.map((c) => c._id);
        }

        // Construct search conditions for remaining query
        const searchOrConditions = [];
        const escapedRemaining = escapeRegex(remainingQuery);

        searchOrConditions.push({ name: { $regex: escapedRemaining, $options: "i" } });
        searchOrConditions.push({ description: { $regex: escapedRemaining, $options: "i" } });

        if (!filter.brand) {
          searchOrConditions.push({ brand: { $regex: escapedRemaining, $options: "i" } });
        }

        variantList.forEach((variant) => {
          if (variant.length < 2) return;
          const esc = escapeRegex(variant);
          searchOrConditions.push({ name: { $regex: esc, $options: "i" } });
          searchOrConditions.push({ description: { $regex: esc, $options: "i" } });
          if (!filter.brand) {
            searchOrConditions.push({ brand: { $regex: esc, $options: "i" } });
          }
        });

        if (matchedCategoryIds.length > 0) {
          searchOrConditions.push({ category: { $in: matchedCategoryIds } });
          searchOrConditions.push({ categories: { $in: matchedCategoryIds } });
        }

        if (searchTokens.length > 1) {
          searchTokens.forEach((tok) => {
            if (tok.length < 2) return;
            const escTok = escapeRegex(tok);
            searchOrConditions.push({ name: { $regex: escTok, $options: "i" } });
          });
        }

        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: searchOrConditions }];
          delete filter.$or;
        } else {
          filter.$or = searchOrConditions;
        }
      } else {
        // remainingQuery is empty (user searched only e.g. "men", "women", "black", "nike")
        if (detectedColor && !detectedGender && !filter.brand) {
          const escCol = escapeRegex(cleanSearch);
          const colorOrConditions = [
            { color: { $regex: `^${escCol}$`, $options: "i" } },
            { color: { $regex: escCol, $options: "i" } },
            { name: { $regex: escCol, $options: "i" } },
            { description: { $regex: escCol, $options: "i" } },
          ];
          if (filter.$or) {
            filter.$and = [{ $or: filter.$or }, { $or: colorOrConditions }];
            delete filter.$or;
          } else {
            filter.$or = colorOrConditions;
          }
        }
      }
    }

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
    RELEVANCE SCORING VS DIRECT DB SORTING
    */
    const hasExplicitSort =
      sort === "price_low" ||
      sort === "price_high" ||
      sort === "newest" ||
      sort === "name_asc" ||
      sort === "name_desc";

    let totalProducts = 0;
    let products = [];

    if (isSearching && (!hasExplicitSort || sort === "relevant")) {
      // Fetch all matching products to score relevance
      const allMatching = await Product.find(filter)
        .populate("category", "name image slug")
        .populate("categories", "name image slug");

      const scoringQuery =
        remainingQuery && remainingQuery.length > 0
          ? remainingQuery
          : cleanSearch;
      const scoringTokens =
        searchTokens && searchTokens.length > 0
          ? searchTokens
          : [scoringQuery];

      // Score and rank
      const scoredProducts = allMatching.map((p) => {
        const score = calculateRelevance(
          p,
          scoringQuery,
          scoringTokens,
          matchedCategoryIds
        );
        return { product: p, score };
      });

      scoredProducts.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (
          new Date(b.product.createdAt || 0) - new Date(a.product.createdAt || 0)
        );
      });

      totalProducts = scoredProducts.length;
      products = scoredProducts
        .slice(skip, skip + limitNumber)
        .map((item) => item.product);
    } else {
      totalProducts = await Product.countDocuments(filter);
      products = await Product.find(filter)
        .populate("category", "name image slug")
        .populate("categories", "name image slug")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber);
    }

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
      categories: matchedCategoryDocs,
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

    if (stock !== undefined) {
      checkAndNotifyLowStock(product);
    }

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
