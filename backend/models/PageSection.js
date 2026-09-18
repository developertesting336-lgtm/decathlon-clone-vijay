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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true }
);

const categoryItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: false,
    },
    linkType: {
      type: String,
      enum: ["page", "category"],
      default: "category",
    },
    title: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    customImage: {
      type: String,
      default: "",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const pageSectionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    data: {
      title: {
        type: String,
        default: "",
      },
      subtitle: {
        type: String,
        default: "",
      },
      image: {
        type: String,
        default: "",
      },
      link: {
        type: String,
        default: "",
      },
      route: {
        type: String,
        default: "",
      },
      products: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      categoryItems: [categoryItemSchema],
      banners: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Banner",
        },
      ],
      items: [itemSchema],
      disabledItemIds: [
        {
          type: String,
        },
      ],
    },
    style: {
      variant: {
        type: String,
        default: "default",
      },
      customClass: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

const PageSection = mongoose.model("PageSection", pageSectionSchema);

export default PageSection;
