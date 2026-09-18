import Page from "../models/Page.js";
import PageSection from "../models/PageSection.js";
import { normalizeSectionType } from "../services/migratePageSections.js";
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

    const processedItem = {
      linkType,
      category: isCatObjectId ? catIdStr : undefined,
      page: isPageObjectId ? pageIdStr : undefined,
      title: titleText,
      name: titleText,
      link: item.link ? String(item.link).trim() : "",
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

/*
========================================
GET ALL PAGES (ADMIN)
========================================
*/
export const getPages = async (req, res) => {
  try {
    const pages = await Page.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error("Get Pages Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
GET PUBLIC PAGES (FOR STORE NAVIGATION)
========================================
*/
export const getPublicPages = async (req, res) => {
  try {
    const pages = await Page.find({ isActive: true })
      .select("_id name slug image description createdAt")
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error("Get Public Pages Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
GET PAGE BY SLUG (PUBLIC/STORE)
========================================
*/
export const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await Page.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .populate("sections.categories")
      .populate({
        path: "sections.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "sections.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("sections.products")
      .populate("sections.banners");

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Try finding dedicated PageSections first
    const dbSections = await PageSection.find({
      pageId: page._id,
      isActive: true,
    })
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

    let activeSections = [];

    if (dbSections && dbSections.length > 0) {
      activeSections = dbSections.map((sec) => ({
        _id: sec._id,
        pageId: sec.pageId,
        name: sec.name,
        type: sec.type,
        order: sec.order,
        sortOrder: sec.order,
        isActive: sec.isActive,
        data: sec.data || {},
        style: sec.style || { variant: "default" },
        // Flat backward compatibility
        title: sec.data?.title || sec.name,
        subtitle: sec.data?.subtitle || "",
        image: sec.data?.image || "",
        categories: sec.data?.categories || [],
        categoryItems: sec.data?.categoryItems || [],
        products: sec.data?.products || [],
        banners: sec.data?.banners || [],
        items: sec.data?.items || [],
        disabledItemIds: sec.data?.disabledItemIds || [],
      }));
    } else {
      // Fall back to embedded sections
      activeSections = (page.sections || [])
        .filter((sec) => sec.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sec, idx) => ({
          _id: sec._id,
          pageId: page._id,
          name: sec.name,
          type: normalizeSectionType(sec.name, sec.type),
          order: sec.sortOrder !== undefined ? sec.sortOrder : idx,
          sortOrder: sec.sortOrder !== undefined ? sec.sortOrder : idx,
          isActive: sec.isActive,
          data: {
            title: sec.name || "",
            subtitle: "",
            image: "",
            products: sec.products || [],
            categories: sec.categories || [],
            categoryItems: sec.categoryItems || [],
            banners: sec.banners || [],
            items: sec.items || [],
          },
          style: { variant: "default" },
          title: sec.name,
          subtitle: "",
          categories: sec.categories || [],
          categoryItems: sec.categoryItems || [],
          products: sec.products || [],
          banners: sec.banners || [],
          items: sec.items || [],
        }));
    }

    return res.status(200).json({
      success: true,
      page: {
        _id: page._id,
        name: page.name,
        slug: page.slug,
        image: page.image || "",
        description: page.description,
        sections: activeSections,
      },
    });
  } catch (error) {
    console.error("Get Page By Slug Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
GET PAGE BY ID (ADMIN)
========================================
*/
export const getPageById = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id)
      .populate("sections.categories")
      .populate({
        path: "sections.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "sections.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("sections.products")
      .populate("sections.banners");

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Try finding dedicated PageSections
    const dbSections = await PageSection.find({ pageId: id })
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

    let allSections = [];

    if (dbSections && dbSections.length > 0) {
      allSections = dbSections.map((sec) => ({
        _id: sec._id,
        pageId: sec.pageId,
        name: sec.name,
        type: sec.type,
        order: sec.order,
        sortOrder: sec.order,
        isActive: sec.isActive,
        data: sec.data || {},
        style: sec.style || { variant: "default" },
        // Flat backward compatibility
        title: sec.data?.title || sec.name,
        subtitle: sec.data?.subtitle || "",
        categories: sec.data?.categories || [],
        categoryItems: sec.data?.categoryItems || [],
        products: sec.data?.products || [],
        banners: sec.data?.banners || [],
        items: sec.data?.items || [],
        disabledItemIds: sec.data?.disabledItemIds || [],
      }));
    } else {
      allSections = (page.sections || [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sec, idx) => ({
          _id: sec._id,
          pageId: page._id,
          name: sec.name,
          type: normalizeSectionType(sec.name, sec.type),
          order: sec.sortOrder !== undefined ? sec.sortOrder : idx,
          sortOrder: sec.sortOrder !== undefined ? sec.sortOrder : idx,
          isActive: sec.isActive,
          data: {
            title: sec.name || "",
            subtitle: "",
            image: "",
            products: sec.products || [],
            categories: sec.categories || [],
            categoryItems: sec.categoryItems || [],
            banners: sec.banners || [],
            items: sec.items || [],
          },
          style: { variant: "default" },
          title: sec.name,
          subtitle: "",
          categories: sec.categories || [],
          categoryItems: sec.categoryItems || [],
          products: sec.products || [],
          banners: sec.banners || [],
          items: sec.items || [],
        }));
    }

    const pageObj = page.toObject();
    pageObj.sections = allSections;

    return res.status(200).json({ success: true, page: pageObj });
  } catch (error) {
    console.error("Get Page By ID Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
CREATE PAGE
========================================
*/
export const createPage = async (req, res) => {
  try {
    const { name, slug, description, image, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Page name is required" });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await Page.findOne({ slug: generatedSlug });
    if (existing) {
      return res
        .status(400)
        .json({ message: `Page slug '${generatedSlug}' already exists` });
    }

    const page = await Page.create({
      name,
      slug: generatedSlug,
      description: description || "",
      image: image || "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      sections: [],
    });

    emitHomepageUpdate({ type: "page_created", slug: page.slug });

    return res.status(201).json({
      success: true,
      message: "Page created successfully",
      page,
    });
  } catch (error) {
    console.error("Create Page Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
UPDATE PAGE METADATA
========================================
*/
export const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, isActive } = req.body;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    if (name !== undefined) page.name = name;
    if (slug !== undefined) {
      const formattedSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const duplicate = await Page.findOne({ _id: { $ne: id }, slug: formattedSlug });
      if (duplicate) {
        return res.status(400).json({ message: `Page slug '${formattedSlug}' already exists` });
      }
      page.slug = formattedSlug;
    }
    if (description !== undefined) page.description = description;
    if (image !== undefined) page.image = image;
    if (isActive !== undefined) page.isActive = Boolean(isActive);

    await page.save();

    emitHomepageUpdate({ type: "page_updated", slug: page.slug });

    return res.status(200).json({
      success: true,
      message: "Page updated successfully",
      page,
    });
  } catch (error) {
    console.error("Update Page Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
DELETE PAGE
========================================
*/
export const deletePage = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    if (page.slug === "home") {
      return res
        .status(400)
        .json({ message: "The default Home page cannot be deleted" });
    }

    await Page.findByIdAndDelete(id);
    await PageSection.deleteMany({ pageId: id });

    emitHomepageUpdate({ type: "page_deleted", slug: page.slug });

    return res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.error("Delete Page Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
ADD SECTION TO PAGE
========================================
*/
export const addPageSection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      categories,
      categoryItems,
      products,
      banners,
      items,
      sortOrder,
      isActive,
    } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .json({ message: "Section name and type are required" });
    }

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    let processedCategoryItems = [];
    if (categoryItems && Array.isArray(categoryItems) && categoryItems.length > 0) {
      try {
        processedCategoryItems = await processCategoryItems(categoryItems);
      } catch (catErr) {
        return res.status(catErr.statusCode || 400).json({ message: catErr.message });
      }
    } else if (categories && Array.isArray(categories) && categories.length > 0) {
      const uniqueCats = [...new Set(categories.map((c) => (c._id || c).toString()))];
      processedCategoryItems = uniqueCats.map((c, i) => ({
        category: c,
        customImage: "",
        sortOrder: i,
      }));
    }

    const finalCategories = processedCategoryItems.map((ci) => ci.category);
    const processedItems = items !== undefined ? await processSectionItems(items) : [];

    const newSection = {
      name,
      type,
      categories: finalCategories,
      categoryItems: processedCategoryItems,
      products: products || [],
      banners: banners || [],
      items: processedItems,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : page.sections.length,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    page.sections.push(newSection);
    await page.save();

    const updatedPage = await Page.findById(id)
      .populate("sections.categories")
      .populate({
        path: "sections.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "sections.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("sections.products")
      .populate("sections.banners");

    emitHomepageUpdate({ type: "section_created", slug: page.slug });

    return res.status(201).json({
      success: true,
      message: "Section added successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Add Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
UPDATE PAGE SECTION
========================================
*/
export const updatePageSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const {
      name,
      type,
      categories,
      categoryItems,
      products,
      banners,
      items,
      sortOrder,
      isActive,
    } = req.body;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const section = page.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (name !== undefined) section.name = name;
    if (type !== undefined) section.type = type;

    if (categoryItems !== undefined) {
      try {
        const processedCategoryItems = await processCategoryItems(categoryItems);
        section.categoryItems = processedCategoryItems;
        section.categories = processedCategoryItems.map((ci) => ci.category);
      } catch (catErr) {
        return res.status(catErr.statusCode || 400).json({ message: catErr.message });
      }
    } else if (categories !== undefined) {
      const uniqueCats = [...new Set(categories.map((c) => (c._id || c).toString()))];
      section.categories = uniqueCats;
      section.categoryItems = uniqueCats.map((c, i) => {
        const existing = section.categoryItems?.find((ci) => ci.category?.toString() === c);
        return {
          category: c,
          customImage: existing ? existing.customImage : "",
          sortOrder: i,
        };
      });
    }

    if (products !== undefined) section.products = products;
    if (banners !== undefined) section.banners = banners;
    if (items !== undefined) section.items = await processSectionItems(items);
    if (sortOrder !== undefined) section.sortOrder = Number(sortOrder);
    if (isActive !== undefined) section.isActive = Boolean(isActive);

    await page.save();

    const updatedPage = await Page.findById(id)
      .populate("sections.categories")
      .populate({
        path: "sections.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "sections.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("sections.products")
      .populate("sections.banners");

    emitHomepageUpdate({ type: "section_updated", slug: page.slug });

    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Update Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
DELETE PAGE SECTION
========================================
*/
export const deletePageSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const section = page.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    section.deleteOne();
    await page.save();

    const updatedPage = await Page.findById(id)
      .populate("sections.categories")
      .populate({
        path: "sections.categoryItems.category",
        model: "Category",
      })
      .populate({
        path: "sections.categoryItems.page",
        model: "Page",
        select: "name slug",
      })
      .populate("sections.products")
      .populate("sections.banners");

    emitHomepageUpdate({ type: "section_deleted", slug: page.slug });

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Delete Page Section Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/*
========================================
REORDER PAGE SECTIONS
========================================
*/
export const reorderPageSections = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionIds } = req.body;

    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({ message: "sectionIds array required" });
    }

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    page.sections.forEach((sec) => {
      const idx = sectionIds.indexOf(sec._id.toString());
      if (idx !== -1) {
        sec.sortOrder = idx;
      }
    });

    page.sections.sort((a, b) => a.sortOrder - b.sortOrder);

    await page.save();

    emitHomepageUpdate({ type: "section_reordered", slug: page.slug });

    return res.status(200).json({
      success: true,
      message: "Sections reordered successfully",
      sections: page.sections,
    });
  } catch (error) {
    console.error("Reorder Page Sections Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
