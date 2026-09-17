import Banner from "../models/Banner.js";
import { emitHomepageUpdate, emitBannerUpdate } from "../socket/socketManager.js";

import { getSingleImageUrl } from "../utils/uploadToCloudinary.js";

/*
========================================
CREATE BANNER
========================================
*/

const createBanner = async (req, res) => {
  try {
    const { title = "", link = "", isActive = true, type = "" } = req.body;

    /*
    IMAGE REQUIRED
    */

    if (!req.file) {
      return res.status(400).json({
        message: "Banner image is required",
      });
    }

    /*
    UPLOAD IMAGE
    */

    const imageUrl = await getSingleImageUrl(req.file, "banners");

    /*
    CREATE BANNER
    */

    const banner = await Banner.create({
      title,
      link,
      type,
      isActive: isActive === true || isActive === "true",
      image: imageUrl,
    });

    /*
    REALTIME UPDATE
    */

    emitBannerUpdate("banner_created", banner);

    emitHomepageUpdate("banner_created", {
      bannerId: banner._id,
      banner,
    });

    /*
    RESPONSE
    */

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
    const banners = await Banner.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      banners,
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
    });

    if (!banner) {
      return res.status(404).json({
        message: "Active banner not found",
      });
    }

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

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found",
      });
    }

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

    /*
    FIND BANNER
    */

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found",
      });
    }

    const { title, link, type, isActive, existingImage } = req.body;

    /*
    UPDATE TITLE
    */

    if (title !== undefined) {
      banner.title = title;
    }

    /*
    UPDATE LINK
    */

    if (link !== undefined) {
      banner.link = link;
    }

    /*
    UPDATE TYPE
    */

    if (type !== undefined) {
      banner.type = type;
    }

    /*
    UPDATE STATUS
    */

    if (isActive !== undefined) {
      banner.isActive = isActive === true || isActive === "true";
    }

    /*
    UPDATE IMAGE
    */

    if (req.file) {
      banner.image = await getSingleImageUrl(req.file, "banners");
    } else if (existingImage !== undefined) {
      banner.image = existingImage;
    }

    /*
    SAVE
    */

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

    /*
    RESPONSE
    */

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

    /*
    RESPONSE
    */

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

/*
========================================
EXPORT
========================================
*/

export {
  createBanner,
  getBanners,
  getActiveBanner,
  getBannerById,
  updateBanner,
  deleteBanner,
};
