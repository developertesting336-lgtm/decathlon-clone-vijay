import Page from "../models/Page.js";
import PageSection from "../models/PageSection.js";
import Category from "../models/Category.js";
import { emitHomepageUpdate } from "../socket/socketManager.js";
import cloudinary from "../config/cloudinary.js";

const processSectionItems = async (items) => {
  if (!items || !Array.isArray(items)) return [];
  const processed = [];
  for (const item of items) {
    let img = item.image || "";
    if (img && typeof img === "string" && img.startsWith("data:image/")) {
      try {
        const uploadRes = await cloudinary.uploader.upload(img, {
          folder: "pages",
          resource_type: "auto",
        });
        img = uploadRes.secure_url;
      } catch (err) {
        console.error("Cloudinary base64 upload failed:", err.message);
      }
    }
    processed.push({
      ...item,
      image: img,
    });
  }
  return processed;
};

const processCategoryItems = async (categoryItems) => {
  if (!categoryItems || !Array.isArray(categoryItems)) return [];
  const processed = [];
  const seenCatIds = new Set();
  const seenPageIds = new Set();

  for (let i = 0; i < categoryItems.length; i++) {
    const item = categoryItems[i];
    const linkType = item.linkType === "page" ? "page" : "category";

    const rawCat =
      item.category && item.category._id
        ? item.category._id
        : item.category || item.categoryId;
    const catIdStr = rawCat ? String(rawCat) : "";
    const isCatObjectId = Boolean(
      catIdStr && /^[0-9a-fA-F]{24}$/.test(catIdStr),
    );

    const rawPage =
      item.page && item.page._id ? item.page._id : item.page || item.pageId;
    const pageIdStr = rawPage ? String(rawPage) : "";
    const isPageObjectId = Boolean(
      pageIdStr && /^[0-9a-fA-F]{24}$/.test(pageIdStr),
    );

    if (linkType === "category" && isCatObjectId) {
      if (seenCatIds.has(catIdStr)) continue;
      seenCatIds.add(catIdStr);
    } else if (linkType === "page" && isPageObjectId) {
      if (seenPageIds.has(pageIdStr)) continue;
      seenPageIds.add(pageIdStr);
    }

    let customImg = item.customImage || item.image || "";
    if (
      customImg &&
      typeof customImg === "string" &&
      customImg.startsWith("data:image/")
    ) {
      try {
        const uploadRes = await cloudinary.uploader.upload(customImg, {
          folder: "pages",
          resource_type: "auto",
        });
        customImg = uploadRes.secure_url;
      } catch (err) {
        console.error(
          "Cloudinary base64 upload failed for customImage:",
          err.message,
        );
      }
    }

    const titleText = (item.title || item.name || "").trim();
    const destType =
      item.destinationType ||
      (linkType === "page" ? "store-page" : "category-page");
    const destId =
      item.destinationId ||
      (destType === "store-page"
        ? pageIdStr
        : destType === "product-page"
          ? String(item.product || item.productId || "")
          : isCatObjectId
            ? catIdStr
            : "");
    let destSlug = item.destinationSlug
      ? String(item.destinationSlug).trim()
      : "";

    if (destType === "category-page" && !destSlug && isCatObjectId) {
      try {
        const catDoc = await Category.findById(catIdStr).select("slug name");
        if (catDoc) {
          destSlug =
            catDoc.slug ||
            catDoc.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-");
        }
      } catch (err) {
        // ignore
      }
    }

    let resolvedLink = item.link ? String(item.link).trim() : "";
    if (destType === "category-page") {
      if (destSlug) {
        resolvedLink = `/category/${destSlug.replace(/^\/category\//, "").replace(/^\//, "")}`;
      }
    } else if (destType === "store-page") {
      if (destSlug) {
        resolvedLink = `/${destSlug.replace(/^\//, "")}`;
      }
    } else if (destType === "product-page") {
      if (destId) {
        resolvedLink = `/product/${destId}`;
      }
    } else if (destType === "none") {
      resolvedLink = "";
    }

    const processedItem = {
      linkType,
      category: isCatObjectId ? catIdStr : undefined,
      page: isPageObjectId ? pageIdStr : undefined,
      destinationType: destType,
      destinationId: destId,
      destinationSlug: destSlug,
      title: titleText,
      name: titleText,
      link: resolvedLink,
      image: customImg,
      customImage: customImg,
      displayOrder:
        item.displayOrder !== undefined
          ? Number(item.displayOrder)
          : item.sortOrder !== undefined
          ? Number(item.sortOrder)
          : i,
      sortOrder:
        item.sortOrder !== undefined
          ? Number(item.sortOrder)
          : item.displayOrder !== undefined
          ? Number(item.displayOrder)
          : i,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    };

    if (item._id && /^[0-9a-fA-F]{24}$/.test(String(item._id))) {
      processedItem._id = item._id;
    }

    processed.push(processedItem);
  }
  return processed;
};

/* ========================================
   SYNC EMBEDDED PAGE SECTIONS (FOR BACKWARD COMPATIBILITY)
======================================== */
export const syncEmbeddedPageSections = async (pageId) => {
  try {
    const sections = await PageSection.find({ pageId }).sort({ order: 1 });
    const embedded = sections.map((sec) => ({
      _id: sec._id,
      name: sec.name,
      type: sec.type,
      sortOrder: sec.order,
      isActive: sec.isActive,
      image: sec.data?.image || "",
      products: sec.data?.products || [],
      link: sec.data?.link || sec.data?.route || "",
      route: sec.data?.route || sec.data?.link || "",
      categories: sec.data?.categories || [],
      categoryItems: sec.data?.categoryItems || [],
      banners: sec.data?.banners || [],
      items: sec.data?.items || [],
      disabledItemIds: sec.data?.disabledItemIds || [],
    }));

    await Page.findByIdAndUpdate(pageId, { sections: embedded });
  } catch (err) {
    console.error("Sync embedded sections error:", err.message);
  }
};

/* ========================================
   GET ALL SECTIONS FOR A PAGE (ADMIN/PUBLIC)
======================================== */
export const getPageSections = async (req, res) => {
  try {
    const pageId = req.params.pageId || req.params.id;

    const sections = await PageSection.find({ pageId })
      .sort({ order: 1 })
      .populate("data.categories")
      .populate({
        path: "data.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "data.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("data.products")
      .populate("data.banners");

    return res.status(200).json({
      success: true,
      sections,
    });
  } catch (error) {
    console.error("Get Page Sections Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ========================================
   CREATE SECTION FOR A PAGE
======================================== */
export const createPageSection = async (req, res) => {
  try {
    const pageId = req.params.pageId || req.params.id;
    const {
      name,
      type,
      order,
      isActive,
      data = {},
      style = {},
      categories,
      categoryItems,
      products,
      banners,
      items,
      sortOrder,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Section name and type are required" });
    }

    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const rawCategoryItems = data.categoryItems || categoryItems || [];
    const rawCategories = data.categories || categories || [];
    let processedCategoryItems = [];

    if (rawCategoryItems.length > 0) {
      try {
        processedCategoryItems = await processCategoryItems(rawCategoryItems);
      } catch (catErr) {
        return res.status(catErr.statusCode || 400).json({ message: catErr.message });
      }
    } else if (rawCategories.length > 0) {
      const uniqueCats = [...new Set(rawCategories.map((c) => (c._id || c).toString()))];
      processedCategoryItems = uniqueCats.map((c, i) => ({
        category: c,
        customImage: "",
        sortOrder: i,
      }));
    }

    const finalCategories = processedCategoryItems.map((ci) => ci.category);
    const rawItems = data.items !== undefined ? data.items : items !== undefined ? items : [];
    const processedItems = await processSectionItems(rawItems);

    const sectionOrder =
      order !== undefined
        ? Number(order)
        : sortOrder !== undefined
        ? Number(sortOrder)
        : await PageSection.countDocuments({ pageId });

    const newSection = await PageSection.create({
      pageId,
      name: name.trim(),
      type: type.trim(),
      order: sectionOrder,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      data: {
        title: data.title !== undefined ? data.title : name.trim(),
        subtitle: data.subtitle || "",
        image: data.image || "",
        link: data.link || data.route || req.body.link || req.body.route || "",
        route: data.route || data.link || req.body.route || req.body.link || "",
        products: data.products || products || [],
        categories: finalCategories,
        categoryItems: processedCategoryItems,
        banners: data.banners || banners || [],
        items: processedItems,
        disabledItemIds: data.disabledItemIds || [],
      },
      style: {
        variant: style.variant || "default",
        customClass: style.customClass || "",
      },
    });

    await syncEmbeddedPageSections(pageId);

    const populatedSection = await PageSection.findById(newSection._id)
      .populate("data.categories")
      .populate({
        path: "data.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "data.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("data.products")
      .populate("data.banners");

    emitHomepageUpdate({ type: "section_created", slug: page.slug });

    return res.status(201).json({
      success: true,
      message: "Section created successfully",
      section: populatedSection,
    });
  } catch (error) {
    console.error("Create Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ========================================
   UPDATE SECTION
======================================== */
export const updatePageSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const {
      name,
      type,
      order,
      isActive,
      data,
      style,
      categories,
      categoryItems,
      products,
      banners,
      items,
      sortOrder,
    } = req.body;

    const section = await PageSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const page = await Page.findById(section.pageId);

    if (name !== undefined) section.name = name.trim();
    if (type !== undefined) section.type = type.trim();
    if (order !== undefined) section.order = Number(order);
    if (sortOrder !== undefined) section.order = Number(sortOrder);
    if (isActive !== undefined) section.isActive = Boolean(isActive);

    if (style !== undefined) {
      section.style = {
        ...section.style,
        ...style,
      };
    }

    if (data !== undefined) {
      section.data = {
        ...section.data,
        ...data,
      };
    }

    // Process categories/categoryItems if provided
    const targetCategoryItems = data?.categoryItems || categoryItems;
    const targetCategories = data?.categories || categories;

    if (targetCategoryItems !== undefined) {
      try {
        const processed = await processCategoryItems(targetCategoryItems);
        section.data.categoryItems = processed;
        section.data.categories = processed
          .map((ci) => ci.category)
          .filter(Boolean);
      } catch (catErr) {
        return res.status(catErr.statusCode || 400).json({ message: catErr.message });
      }
    } else if (targetCategories !== undefined) {
      const uniqueCats = [...new Set(targetCategories.map((c) => (c._id || c).toString()))];
      section.data.categories = uniqueCats;
      section.data.categoryItems = uniqueCats.map((c, i) => {
        const existing = section.data.categoryItems?.find((ci) => ci.category?.toString() === c);
        return {
          category: c,
          customImage: existing ? existing.customImage : "",
          sortOrder: i,
        };
      });
    }

    if (products !== undefined) section.data.products = products;
    if (data?.products !== undefined) section.data.products = data.products;

    if (banners !== undefined) section.data.banners = banners;
    if (data?.banners !== undefined) section.data.banners = data.banners;

    const targetItems = data?.items !== undefined ? data.items : items;
    if (targetItems !== undefined) {
      section.data.items = await processSectionItems(targetItems);
    } else if (section.data.categoryItems && section.data.categoryItems.length > 0 && (!section.data.items || section.data.items.length === 0)) {
      section.data.items = section.data.categoryItems.map((ci) => ({
        name: ci.name || "Category",
        image: ci.customImage || "",
        link: ci.link || "",
        isActive: ci.isActive !== false,
      }));
    }

    if (data?.disabledItemIds !== undefined) {
      section.data.disabledItemIds = data.disabledItemIds;
    } else if (req.body.disabledItemIds !== undefined) {
      section.data.disabledItemIds = req.body.disabledItemIds;
    }

    if (data?.title !== undefined) section.data.title = data.title;
    if (data?.subtitle !== undefined) section.data.subtitle = data.subtitle;
    if (data?.image !== undefined) section.data.image = data.image;

    await section.save();
    await syncEmbeddedPageSections(section.pageId);

    const populated = await PageSection.findById(sectionId)
      .populate("data.categories")
      .populate({
        path: "data.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "data.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("data.products")
      .populate("data.banners");

    emitHomepageUpdate({ type: "section_updated", slug: page?.slug });

    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      section: populated,
    });
  } catch (error) {
    console.error("Update Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ========================================
   DELETE SECTION
======================================== */
export const deletePageSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await PageSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const pageId = section.pageId;
    const page = await Page.findById(pageId);

    await PageSection.findByIdAndDelete(sectionId);
    await syncEmbeddedPageSections(pageId);

    emitHomepageUpdate({ type: "section_deleted", slug: page?.slug });

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ========================================
   DUPLICATE SECTION
======================================== */
export const duplicatePageSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const original = await PageSection.findById(sectionId);
    if (!original) {
      return res.status(404).json({ message: "Original section not found" });
    }

    const highest = await PageSection.findOne({ pageId: original.pageId }).sort({ order: -1 });
    const newOrder = highest ? highest.order + 1 : original.order + 1;

    const duplicateDoc = {
      pageId: original.pageId,
      name: `${original.name} (Copy)`,
      type: original.type,
      order: newOrder,
      isActive: original.isActive,
      data: {
        title: original.data.title ? `${original.data.title} (Copy)` : "",
        subtitle: original.data.subtitle || "",
        image: original.data.image || "",
        link: original.data.link || original.link || "",
        route: original.data.route || original.route || "",
        products: original.data.products || [],
        categories: original.data.categories || [],
        categoryItems: original.data.categoryItems || [],
        banners: original.data.banners || [],
        items: original.data.items || [],
        disabledItemIds: original.data.disabledItemIds || original.disabledItemIds || [],
      },
      style: {
        variant: original.style?.variant || "default",
        customClass: original.style?.customClass || "",
      },
    };

    const created = await PageSection.create(duplicateDoc);
    await syncEmbeddedPageSections(original.pageId);

    const page = await Page.findById(original.pageId);
    emitHomepageUpdate({ type: "section_created", slug: page?.slug });

    const populated = await PageSection.findById(created._id)
      .populate("data.categories")
      .populate({
        path: "data.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "data.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("data.products")
      .populate("data.banners");

    return res.status(201).json({
      success: true,
      message: "Section duplicated successfully",
      section: populated,
    });
  } catch (error) {
    console.error("Duplicate Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ========================================
   REORDER SECTIONS
======================================== */
export const reorderPageSections = async (req, res) => {
  try {
    const pageId = req.params.pageId || req.params.id;
    const { sectionIds } = req.body;

    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({ message: "sectionIds array required" });
    }

    const updates = sectionIds.map((id, index) =>
      PageSection.findByIdAndUpdate(id, { order: index })
    );
    await Promise.all(updates);

    if (pageId) {
      await syncEmbeddedPageSections(pageId);
      const page = await Page.findById(pageId);
      emitHomepageUpdate({ type: "section_reordered", slug: page?.slug });
    }

    const updatedSections = await PageSection.find(pageId ? { pageId } : { _id: { $in: sectionIds } })
      .sort({ order: 1 })
      .populate("data.categories")
      .populate({
        path: "data.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "data.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("data.products")
      .populate("data.banners");

    return res.status(200).json({
      success: true,
      message: "Sections reordered successfully",
      sections: updatedSections,
    });
  } catch (error) {
    console.error("Reorder Page Sections Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
