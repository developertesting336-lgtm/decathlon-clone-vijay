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

export { addToWishlist, getWishlist, removeFromWishlist};