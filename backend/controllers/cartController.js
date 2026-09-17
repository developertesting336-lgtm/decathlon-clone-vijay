import Cart from "../models/cart.js";
import Product from "../models/Product.js";

/*
========================================
ADD TO CART
========================================
*/

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size = "" } = req.body;

    /*
    ========================================
    VALIDATION
    ========================================
    */

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!quantity || Number(quantity) < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    /*
    ========================================
    FIND PRODUCT
    ========================================
    */

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    /*
    ========================================
    SIZE VALIDATION
    ========================================
    */

    if (
      size &&
      Array.isArray(product.size) &&
      product.size.length > 0 &&
      !product.size.includes(size)
    ) {
      return res.status(400).json({
        message: "Selected size is not available",
      });
    }

    /*
    ========================================
    STOCK VALIDATION
    ========================================
    */

    if (Number(quantity) > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} items available`,
      });
    }

    /*
    ========================================
    FIND USER CART
    ========================================
    */

    let cart = await Cart.findOne({
      user: req.user.id,
    });

    /*
    ========================================
    CREATE CART
    ========================================
    */

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,

        items: [
          {
            product: productId,
            quantity: Number(quantity),
            size,
          },
        ],
      });
    } else {
      /*
      ======================================
      EXISTING CART
      ======================================
      */

      const existingItem = cart.items.find(
        (item) =>
          item.product.toString() === productId &&
          (item.size || "") === (size || ""),
      );

      /*
      ======================================
      SAME PRODUCT + SAME SIZE
      ======================================
      */

      if (existingItem) {
        const newQuantity = Number(existingItem.quantity) + Number(quantity);

        if (newQuantity > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} items available`,
          });
        }

        existingItem.quantity = newQuantity;
      } else {
        /*
        ====================================
        SAME PRODUCT + DIFFERENT SIZE
        ====================================
        */

        cart.items.push({
          product: productId,
          quantity: Number(quantity),
          size,
        });
      }

      await cart.save();
    }

    /*
    ========================================
    UPDATED CART
    ========================================
    */

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",

      select:
        "name description price discountPrice images brand stock size color",
    });

    return res.status(200).json({
      message: "Product added to cart",

      cart: updatedCart,
    });
  } catch (error) {
    console.error("Add To Cart Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to add product to cart",
    });
  }
};

/*
========================================
GET CART
========================================
*/

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
    }).populate({
      path: "items.product",

      select:
        "name description price discountPrice images brand stock size color",
    });

    /*
    ========================================
    EMPTY CART
    ========================================
    */

    if (!cart) {
      return res.status(200).json({
        message: "Cart is empty",

        cart: {
          items: [],
        },
      });
    }

    /*
    ========================================
    SUCCESS
    ========================================
    */

    return res.status(200).json({
      cart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to get cart",
    });
  }
};

/*
========================================
UPDATE CART
QUANTITY + SIZE
========================================
*/

const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;

    const { quantity, size = "", oldSize, newSize } = req.body;

    /* ========================================
         VALIDATION
      ======================================== */

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!quantity || Number(quantity) < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    /* ========================================
         FIND CART
      ======================================== */

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    /* ========================================
         FIND PRODUCT
      ======================================== */

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    /* ========================================
         SIZE UPDATE
      ======================================== */

    if (oldSize !== undefined && newSize !== undefined) {
      const oldSizeValue = oldSize || "";

      const newSizeValue = newSize || "";

      /*
        ----------------------------------------
        VALIDATE NEW SIZE
        ----------------------------------------
        */

      const availableSizes = Array.isArray(product.size) ? product.size : [];

      if (
        newSizeValue &&
        availableSizes.length > 0 &&
        !availableSizes.includes(newSizeValue)
      ) {
        return res.status(400).json({
          message: "Selected size is not available",
        });
      }

      /*
        ----------------------------------------
        FIND OLD CART ITEM
        ----------------------------------------
        */

      const oldItem = cart.items.find(
        (item) =>
          item.product.toString() === productId &&
          (item.size || "") === oldSizeValue,
      );

      if (!oldItem) {
        return res.status(404).json({
          message: "Product with selected size not found in cart",
        });
      }

      /*
        ----------------------------------------
        SAME SIZE
        ----------------------------------------
        */

      if (oldSizeValue === newSizeValue) {
        oldItem.quantity = Number(quantity);

        await cart.save();
      } else {
        /*
          --------------------------------------
          CHECK IF NEW SIZE ALREADY EXISTS
          --------------------------------------
          */

        const existingNewItem = cart.items.find(
          (item) =>
            item !== oldItem &&
            item.product.toString() === productId &&
            (item.size || "") === newSizeValue,
        );

        if (existingNewItem) {
          /*
            ==============================
            MERGE
            ==============================
            */

          const totalQuantity =
            Number(existingNewItem.quantity) + Number(quantity);

          if (totalQuantity > product.stock) {
            return res.status(400).json({
              message: `Only ${product.stock} items available`,
            });
          }

          existingNewItem.quantity = totalQuantity;

          cart.items = cart.items.filter((item) => item !== oldItem);
        } else {
          /*
            ==============================
            CHANGE SIZE
            ==============================
            */

          oldItem.size = newSizeValue;

          oldItem.quantity = Number(quantity);
        }

        await cart.save();
      }

      /*
        ======================================
        UPDATED CART
        ======================================
        */

      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.product",

        select:
          "name description price discountPrice images brand stock size color",
      });

      return res.status(200).json({
        message: "Cart size updated",

        cart: updatedCart,
      });
    }

    /* ========================================
         NORMAL QUANTITY UPDATE
      ======================================== */

    const selectedSize = size || "";

    const item = cart.items.find(
      (cartItem) =>
        cartItem.product.toString() === productId &&
        (cartItem.size || "") === selectedSize,
    );

    if (!item) {
      return res.status(404).json({
        message: "Product with selected size not found in cart",
      });
    }

    /* ========================================
         STOCK
      ======================================== */

    if (Number(quantity) > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} items available`,
      });
    }

    /* ========================================
         UPDATE QUANTITY
      ======================================== */

    item.quantity = Number(quantity);

    await cart.save();

    /* ========================================
         UPDATED CART
      ======================================== */

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",

      select:
        "name description price discountPrice images brand stock size color",
    });

    return res.status(200).json({
      message: "Cart quantity updated",

      cart: updatedCart,
    });
  } catch (error) {
    console.error("Update Cart Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to update cart",
    });
  }
};
/*
========================================
REMOVE FROM CART
========================================
*/

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const { size = "" } = req.query;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.some(
      (item) =>
        item.product.toString() === productId &&
        (item.size || "") === (size || ""),
    );

    if (!itemExists) {
      return res.status(404).json({
        message: "Product with selected size not found in cart",
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          (item.size || "") === (size || "")
        ),
    );

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",

      select:
        "name description price discountPrice images brand stock size color",
    });

    return res.status(200).json({
      message: "Product removed from cart",

      cart: updatedCart,
    });
  } catch (error) {
    console.error("Remove From Cart Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to remove product",
    });
  }
};

/*
========================================
CLEAR CART
========================================
*/

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      message: "Cart cleared successfully",

      cart,
    });
  } catch (error) {
    console.error("Clear Cart Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to clear cart",
    });
  }
};

export { addToCart, getCart, updateCartQuantity, removeFromCart, clearCart };
