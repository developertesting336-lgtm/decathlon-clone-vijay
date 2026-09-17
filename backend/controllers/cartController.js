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

    const { quantity, size = "", oldSize, newSize, cartItemId } = req.body;

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
         SIZE UPDATE OR QUANTITY UPDATE
      ======================================== */

    const isSizeUpdate =
      (oldSize !== undefined && newSize !== undefined) ||
      newSize !== undefined ||
      (oldSize !== undefined && size && oldSize !== size);

    if (isSizeUpdate) {
      const targetOldSize = (
        oldSize !== undefined
          ? oldSize
          : cartItemId
            ? cart.items.find((item) => item._id?.toString() === cartItemId.toString())?.size
            : size
      ) || "";

      const targetNewSize = (newSize !== undefined ? newSize : size) || "";

      /*
        ----------------------------------------
        VALIDATE NEW SIZE
        ----------------------------------------
      */

      const availableSizes = Array.isArray(product.size) ? product.size : [];

      if (
        targetNewSize &&
        availableSizes.length > 0 &&
        !availableSizes.some(
          (s) => s.trim().toLowerCase() === targetNewSize.trim().toLowerCase()
        )
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

      let oldItem = null;
      if (cartItemId) {
        oldItem = cart.items.find(
          (item) => item._id?.toString() === cartItemId.toString()
        );
      }
      if (!oldItem) {
        oldItem = cart.items.find(
          (item) =>
            (item.product?.toString() === productId ||
              item.product?._id?.toString() === productId) &&
            (item.size || "").trim().toLowerCase() === targetOldSize.trim().toLowerCase()
        );
      }
      if (!oldItem) {
        const productItems = cart.items.filter(
          (item) =>
            item.product?.toString() === productId ||
            item.product?._id?.toString() === productId
        );
        if (productItems.length === 1) {
          oldItem = productItems[0];
        }
      }

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

      if (
        (oldItem.size || "").trim().toLowerCase() ===
        targetNewSize.trim().toLowerCase()
      ) {
        if (Number(quantity) > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} items available`,
          });
        }
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
            item._id?.toString() !== oldItem._id?.toString() &&
            (item.product?.toString() === productId ||
              item.product?._id?.toString() === productId) &&
            (item.size || "").trim().toLowerCase() ===
              targetNewSize.trim().toLowerCase()
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

          cart.items = cart.items.filter(
            (item) => item._id?.toString() !== oldItem._id?.toString()
          );
        } else {
          /*
            ==============================
            CHANGE SIZE
            ==============================
          */

          if (Number(quantity) > product.stock) {
            return res.status(400).json({
              message: `Only ${product.stock} items available`,
            });
          }

          oldItem.size = targetNewSize;
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

    const selectedSize = (size || "").trim().toLowerCase();

    let item = null;
    if (cartItemId) {
      item = cart.items.find(
        (cItem) => cItem._id?.toString() === cartItemId.toString()
      );
    }
    if (!item) {
      item = cart.items.find(
        (cartItem) =>
          (cartItem.product?.toString() === productId ||
            cartItem.product?._id?.toString() === productId) &&
          (cartItem.size || "").trim().toLowerCase() === selectedSize
      );
    }
    if (!item) {
      const productItems = cart.items.filter(
        (cItem) =>
          cItem.product?.toString() === productId ||
          cItem.product?._id?.toString() === productId
      );
      if (productItems.length === 1) {
        item = productItems[0];
      }
    }

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

    const { size = "", cartItemId } = req.query;

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

    const targetSize = (size || "").trim().toLowerCase();

    let itemIndex = cart.items.findIndex((item) => {
      if (cartItemId && item._id?.toString() === cartItemId.toString()) {
        return true;
      }
      const prodMatch =
        item.product?.toString() === productId ||
        item.product?._id?.toString() === productId;
      const sizeMatch =
        (item.size || "").trim().toLowerCase() === targetSize;
      return prodMatch && sizeMatch;
    });

    if (itemIndex === -1) {
      const productItems = cart.items.filter(
        (item) =>
          item.product?.toString() === productId ||
          item.product?._id?.toString() === productId
      );
      if (productItems.length === 1) {
        itemIndex = cart.items.findIndex(
          (item) =>
            item.product?.toString() === productId ||
            item.product?._id?.toString() === productId
        );
      }
    }

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Product with selected size not found in cart",
      });
    }

    cart.items.splice(itemIndex, 1);

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
