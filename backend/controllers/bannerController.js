import Banner from "../models/Banner.js";
import { emitHomepageUpdate, emitBannerUpdate } from "../socket/socketManager.js";
import { getSingleImageUrl, getMultipleImageUrls } from "../utils/uploadToCloudinary.js";

/*
========================================
CREATE BANNER
========================================
*/

const createBanner = async (req, res) => {
  try {
    const {
      title = "",
      link = "",
      isActive = true,
      type = "",
      subcategory = "",
    } = req.body;

    /*
    COLLECT UPLOADED FILES
    */
    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    /*
    COLLECT EXISTING / URL STRINGS IF ANY
    */
    let existingUrlList = [];
    if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        existingUrlList = req.body.images;
      } else if (typeof req.body.images === "string") {
        try {
          const parsed = JSON.parse(req.body.images);
          existingUrlList = Array.isArray(parsed) ? parsed : [req.body.images];
        } catch {
          existingUrlList = [req.body.images];
        }
      }
    } else if (
      req.body.image &&
      typeof req.body.image === "string" &&
      (req.body.image.startsWith("http") || req.body.image.startsWith("/uploads"))
    ) {
      existingUrlList = [req.body.image];
    }

    if (uploadedFiles.length === 0 && existingUrlList.length === 0) {
      return res.status(400).json({
        message: "Banner image is required",
      });
    }

    /*
    UPLOAD IMAGES TO CLOUDINARY
    */
    let newUploadedUrls = [];
    if (uploadedFiles.length > 0) {
      newUploadedUrls = await getMultipleImageUrls(uploadedFiles, "banners");
    }

    const allImages = [...existingUrlList, ...newUploadedUrls].filter(Boolean);

    if (allImages.length === 0) {
      return res.status(400).json({
        message: "Failed to process banner image(s)",
      });
    }

    /*
    CREATE BANNER
    */
    const banner = await Banner.create({
      title: title.trim(),
      subcategory: (subcategory || "").trim(),
      link: link.trim(),
      type: (type || "").trim(),
      isActive: isActive === true || isActive === "true",
      image: allImages[0] || "",
      images: allImages,
    });

    /*
    REALTIME UPDATE
    */
    emitBannerUpdate("banner_created", banner);

    emitHomepageUpdate("banner_created", {
      bannerId: banner._id,
      banner,
    });

    return res.status(201).json({
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    console.error("Create Banner Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET ALL BANNERS
========================================
*/

const getBanners = async (req, res) => {
  try {
    const { type, subcategory, active, isActive } = req.query;
    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (subcategory) {
      filter.subcategory = { $regex: new RegExp(`^${subcategory.trim()}$`, "i") };
    }

    const activeFilter = active !== undefined ? active : isActive;
    if (activeFilter !== undefined) {
      filter.isActive =
        activeFilter === "true" || activeFilter === true ? { $ne: false } : false;
    }

    const banners = await Banner.find(filter).sort({
      createdAt: -1,
    }).lean();

    const formatted = banners.map((b) => ({
      ...b,
      images:
        b.images && b.images.length > 0
          ? b.images
          : b.image
          ? [b.image]
          : [],
      subcategory: b.subcategory || "",
    }));

    return res.status(200).json({
      banners: formatted,
    });
  } catch (error) {
    console.error("Get Banners Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET ACTIVE BANNER
========================================
*/

const getActiveBanner = async (req, res) => {
  try {
    const { type } = req.params;

    const banner = await Banner.findOne({
      type,
      isActive: true,
    }).sort({
      createdAt: -1,
    }).lean();

    if (!banner) {
      return res.status(404).json({
        message: "Active banner not found",
      });
    }

    banner.images =
      banner.images && banner.images.length > 0
        ? banner.images
        : banner.image
        ? [banner.image]
        : [];
    banner.subcategory = banner.subcategory || "";

    return res.status(200).json({
      banner,
    });
  } catch (error) {
    console.error("Get Active Banner Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
GET BANNER BY ID
========================================
*/

const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id).lean();

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found",
      });
    }

    banner.images =
      banner.images && banner.images.length > 0
        ? banner.images
        : banner.image
        ? [banner.image]
        : [];
    banner.subcategory = banner.subcategory || "";

    return res.status(200).json({
      banner,
    });
  } catch (error) {
    console.error("Get Banner Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
UPDATE BANNER
========================================
*/

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found",
      });
    }

    const {
      title,
      link,
      type,
      isActive,
      subcategory,
      existingImages,
      existingImage,
    } = req.body;

    if (title !== undefined) {
      banner.title = title.trim();
    }

    if (subcategory !== undefined) {
      banner.subcategory = (subcategory || "").trim();
    }

    if (link !== undefined) {
      banner.link = link.trim();
    }

    if (type !== undefined) {
      banner.type = type.trim();
    }

    if (isActive !== undefined) {
      banner.isActive = isActive === true || isActive === "true";
    }

    /*
    PROCESS EXISTING IMAGES
    */
    let parsedExistingImages = [];
    if (existingImages !== undefined) {
      if (Array.isArray(existingImages)) {
        parsedExistingImages = existingImages;
      } else if (typeof existingImages === "string") {
        try {
          const parsed = JSON.parse(existingImages);
          parsedExistingImages = Array.isArray(parsed) ? parsed : [existingImages];
        } catch {
          parsedExistingImages = existingImages ? [existingImages] : [];
        }
      }
    } else if (existingImage !== undefined) {
      parsedExistingImages = existingImage ? [existingImage] : [];
    } else {
      // Retain currently stored images if not explicitly specified
      parsedExistingImages =
        banner.images && banner.images.length > 0
          ? banner.images
          : banner.image
          ? [banner.image]
          : [];
    }

    /*
    PROCESS NEW FILE UPLOADS
    */
    const uploadedFiles = req.files || (req.file ? [req.file] : []);
    let newUploadedUrls = [];
    if (uploadedFiles.length > 0) {
      newUploadedUrls = await getMultipleImageUrls(uploadedFiles, "banners");
    }

    const finalImages = [...parsedExistingImages, ...newUploadedUrls].filter(Boolean);

    if (finalImages.length > 0) {
      banner.images = finalImages;
      banner.image = finalImages[0];
    } else if (
      existingImages !== undefined ||
      existingImage !== undefined ||
      uploadedFiles.length > 0
    ) {
      banner.images = [];
      banner.image = "";
    }

    await banner.save();

    /*
    REALTIME UPDATE
    */
    emitBannerUpdate("banner_updated", banner);

    emitHomepageUpdate("banner_updated", {
      bannerId: banner._id,
      type: banner.type,
      isActive: banner.isActive,
      banner,
    });

    return res.status(200).json({
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("Update Banner Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
========================================
DELETE BANNER
========================================
*/

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found",
      });
    }

    await Banner.findByIdAndDelete(id);

    /*
    REALTIME UPDATE
    */
    emitBannerUpdate("banner_deleted", { bannerId: id });

    emitHomepageUpdate("banner_deleted", {
      bannerId: id,
    });

    return res.status(200).json({
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete Banner Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export {
  createBanner,
  getBanners,
  getActiveBanner,
  getBannerById,
  updateBanner,
  deleteBanner,
};
