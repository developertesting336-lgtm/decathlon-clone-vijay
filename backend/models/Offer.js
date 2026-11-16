import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
      maxlength: [100, "Offer title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    bannerText: {
      type: String,
      default: "",
      trim: true,
      maxlength: [150, "Banner text cannot exceed 150 characters"],
    },
    badgeLabel: {
      type: String,
      default: "Special Deal",
      trim: true,
      maxlength: [40, "Badge label cannot exceed 40 characters"],
    },

    // 1. Target Scope
    targetType: {
      type: String,
      enum: {
        values: ["product", "category", "sitewide"],
        message: "targetType must be 'product', 'category', or 'sitewide'",
      },
      required: [true, "Target type is required"],
      default: "product",
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // 2. Discount Configuration
    discountType: {
      type: String,
      enum: {
        values: ["percentage", "flat"],
        message: "discountType must be either 'percentage' or 'flat'",
      },
      required: [true, "Discount type is required"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
      validate: {
        validator: function (val) {
          if (val < 0) return false;
          if (this.discountType === "percentage" && val > 90) return false;
          return true;
        },
        message: "Percentage discount must be between 0% and 90%",
      },
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount amount cannot be negative"],
    },

    // 3. Scheduling
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (val) {
          return !this.startDate || val > this.startDate;
        },
        message: "End date must be after start date",
      },
    },

    // 4. Priority (1 to 100: higher wins)
    priority: {
      type: Number,
      default: 1,
      min: [1, "Priority minimum is 1"],
      max: [100, "Priority maximum is 100"],
    },

    // 5. Status & Flags
    status: {
      type: String,
      enum: ["scheduled", "active", "expired", "disabled"],
      default: "scheduled",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to dynamically derive status according to current clock
offerSchema.methods.getCalculatedStatus = function (now = new Date()) {
  if (!this.isActive) return "disabled";
  if (now < new Date(this.startDate)) return "scheduled";
  if (now > new Date(this.endDate)) return "expired";
  return "active";
};

// Pre-save hook to synchronize status field
offerSchema.pre("save", function () {
  this.status = this.getCalculatedStatus();
});

// Indexes for high-performance offer matching and conflict resolution
offerSchema.index({ status: 1, isActive: 1, startDate: 1, endDate: 1, priority: -1 });
offerSchema.index({ applicableProducts: 1 });
offerSchema.index({ applicableCategories: 1 });
offerSchema.index({ targetType: 1 });

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
