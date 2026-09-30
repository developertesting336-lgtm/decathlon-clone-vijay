import mongoose from "mongoose";

const measurementItemSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    chest: {
      type: String,
      default: "",
      trim: true,
    },
    waist: {
      type: String,
      default: "",
      trim: true,
    },
    hip: {
      type: String,
      default: "",
      trim: true,
    },
    footLength: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const sizeGuideSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Size guide name is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      default: null,
      index: true,
    },
    gender: {
      type: String,
      enum: ["Men", "Women", "Kids", "Unisex", "All"],
      default: "Unisex",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    measurements: {
      type: [measurementItemSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

sizeGuideSchema.index({ category: 1, gender: 1 });

const SizeGuide = mongoose.model("SizeGuide", sizeGuideSchema);

export default SizeGuide;
