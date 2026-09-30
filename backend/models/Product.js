import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    images: [
      {
        type: String,
      },
    ],

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    brand: {
      type: String,
      default: "Decathlon",
      trim: true,
    },

    gender: {
      type: String,
      enum: ["Men", "Women", "Kids", "Unisex"],
      default: "Unisex",
      trim: true,
    },

    size: [
      {
        type: String,
        trim: true,
      },
    ],

    color: [
      {
        type: String,
        trim: true,
      },
    ],

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    review: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    onSale: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lowStockNotified: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

productSchema.index({ category: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ isActive: 1, category: 1 });
productSchema.index({ isActive: 1, subcategory: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, price: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
