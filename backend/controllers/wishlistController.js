import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: req.user.id,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        products: [productId],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );

      if (alreadyExists) {
        return res.status(400).json({
          message: "Product already in wishlist",
        });
      }

      wishlist.products.push(productId);
      await wishlist.save();
    }

    const updatedWishlist = await Wishlist.findById(
      wishlist._id
    ).populate("products");

    res.status(200).json({
      message: "Product added to wishlist",
      wishlist: updatedWishlist,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      user: req.user.id,
    }).populate({
      path: "products",
      select:
        "name price discountPrice images brand stock size color category",
    });

    if (!wishlist) {
      return res.status(200).json({
        wishlist: {
          products: [],
        },
      });
    }

    res.status(200).json({
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({
      user: req.user.id,
    });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist not found",
      });
    }

    const productExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (!productExists) {
      return res.status(404).json({
        message: "Product not found in wishlist",
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();

    const updatedWishlist = await Wishlist.findById(
      wishlist._id
    ).populate({
      path: "products",
      select:
        "name price discountPrice images brand stock size color category",
    });

    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist: updatedWishlist,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


/*
========================================
SYNC / MERGE GUEST WISHLIST
========================================
*/
const syncWishlist = async (req, res) => {
  try {
    const { productIds = [] } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        products: [],
      });
    }

    if (Array.isArray(productIds) && productIds.length > 0) {
      for (const pId of productIds) {
        if (!pId) continue;
        const exists = wishlist.products.some((id) => id.toString() === pId.toString());
        if (!exists) {
          const product = await Product.findById(pId);
          if (product) {
            wishlist.products.push(pId);
          }
        }
      }
      await wishlist.save();
    }

    const updatedWishlist = await Wishlist.findById(wishlist._id).populate({
      path: "products",
      select: "name price discountPrice images brand stock size color category",
    });

    return res.status(200).json({
      message: "Wishlist synced successfully",
      wishlist: updatedWishlist,
    });
  } catch (error) {
    console.error("Sync Wishlist Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to sync wishlist",
    });
  }
};


export { addToWishlist, getWishlist, removeFromWishlist, syncWishlist };