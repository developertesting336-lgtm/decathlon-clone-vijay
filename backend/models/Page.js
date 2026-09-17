import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    tag: {
      type: String,
      default: "",
    },
  },
  { _id: true, timestamps: true }
);

const categoryItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    customImage: {
      type: String,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["category", "product", "banner", "other"],
      required: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    categoryItems: [categoryItemSchema],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    banners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Banner",
      },
    ],
    items: [itemSchema],
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true }
);

const pageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sections: [sectionSchema],
  },
  { timestamps: true }
);

const Page = mongoose.model("Page", pageSchema);

export default Page;
