import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.role === "admin";
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    avatar: {
      type: String,
      default: "",
    },

    designation: {
      type: String,
      default: "Store Administrator",
    },

    dob: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      default: "",
    },

    cardNumber: {
      type: String,
      default: "2 094724 479967",
    },

    isPhoneVerified: {
      type: Boolean,
      default: true,
    },

    communicationPreferences: {
      abandonedCartAndRecommendations: {
        type: Boolean,
        default: true,
      },
      feedbackAndSurveys: {
        type: Boolean,
        default: false,
      },
      expertTipsAndOffers: {
        type: Boolean,
        default: true,
      },
      membershipUpdates: {
        type: Boolean,
        default: true,
      },
      emailChannel: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: "English (India)",
      },
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model(
  "User",
  userSchema,
);

export default User;