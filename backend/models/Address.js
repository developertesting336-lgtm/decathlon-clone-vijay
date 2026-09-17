import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    houseBuilding: {
      type: String,
      required: true,
      trim: true,
    },

    streetLocality: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    cityState: {
      type: String,
      required: true,
      trim: true,
    },

    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);

export default Address;