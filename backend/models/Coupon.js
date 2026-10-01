import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: {
        values: ["flat", "percentage"],
        message: "Discount type must be either 'flat' or 'percentage'",
      },
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
      validate: {
        validator: function (val) {
          if (val < 0) return false;
          const type =
            this.discountType ||
            (this.getUpdate &&
              (this.getUpdate().$set?.discountType || this.getUpdate().discountType));
          if (type === "percentage" && val > 100) return false;
          return true;
        },
        message: function (props) {
          if (props.value < 0) return "Discount value cannot be negative";
          return "Percentage discount must not exceed 100";
        },
      },
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: [0, "Minimum order value cannot be negative"],
    },
    maximumDiscount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    usageLimit: {
      type: Number,
      default: 0,
      min: [0, "Usage limit cannot be negative"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
      validate: {
        validator: function (val) {
          if (val < 0) return false;
          const limit =
            this.usageLimit !== undefined
              ? this.usageLimit
              : this.getUpdate &&
                (this.getUpdate().$set?.usageLimit ?? this.getUpdate().usageLimit);
          if (limit > 0 && val > limit) return false;
          return true;
        },
        message: "usedCount cannot exceed usageLimit when usageLimit is greater than 0",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    /*
    ========================================================
    COUPON DISTRIBUTION & ELIGIBILITY FIELDS (STEP 1)
    ========================================================
    */
    distributionType: {
      type: String,
      enum: {
        values: [
          "global",
          "new_user",
          "inactive_user",
          "selected_users",
          "user_group",
          "category_based",
          "product_based",
        ],
        message: "Invalid distribution type",
      },
      default: "global",
    },

    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    eligibilityRules: {
      group: {
        type: String,
        trim: true,
        default: "",
      },
      userGroup: {
        type: String,
        trim: true,
        default: "",
      },
      minimumOrders: {
        type: Number,
        default: 0,
        min: [0, "Minimum orders cannot be negative"],
      },
      minimumSpend: {
        type: Number,
        default: 0,
        min: [0, "Minimum spend cannot be negative"],
      },
    },

    inactiveDays: {
      type: Number,
      default: 0,
      min: [0, "Inactive days cannot be negative"],
    },

    newUserDays: {
      type: Number,
      default: 0,
      min: [0, "New user days cannot be negative"],
    },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    perUserLimit: {
      type: Number,
      default: 1,
      min: [1, "Per-user limit must be at least 1"],
    },

    eligibilityDuration: {
      type: Number,
      default: 7,
      min: [0, "Eligibility duration cannot be negative"],
    },

    priority: {
      type: Number,
      default: 0,
      min: [0, "Priority cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

/*
========================================
PRE-VALIDATE HOOK
========================================
*/
couponSchema.pre("validate", function () {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }

  if (this.discountValue < 0) {
    this.invalidate("discountValue", "Discount value cannot be negative");
  }

  if (this.discountType === "percentage" && this.discountValue > 100) {
    this.invalidate("discountValue", "Percentage discount must not exceed 100");
  }

  if (this.discountType === "flat" && this.discountValue < 0) {
    this.invalidate("discountValue", "Flat discount cannot be negative");
  }

  if (this.usageLimit > 0 && this.usedCount > this.usageLimit) {
    this.invalidate(
      "usedCount",
      "usedCount cannot exceed usageLimit when usageLimit is greater than 0"
    );
  }

  // Deduplicate assignedUsers
  if (Array.isArray(this.assignedUsers)) {
    const userSet = new Set();
    const cleanUsers = [];
    for (const u of this.assignedUsers) {
      if (!u) continue;
      const uStr = u._id ? u._id.toString() : u.toString();
      if (!userSet.has(uStr)) {
        userSet.add(uStr);
        cleanUsers.push(u);
      }
    }
    this.assignedUsers = cleanUsers;
  }

  // Deduplicate categories
  if (Array.isArray(this.categories)) {
    const catSet = new Set();
    const cleanCats = [];
    for (const c of this.categories) {
      if (!c) continue;
      const cStr = c._id ? c._id.toString() : c.toString();
      if (!catSet.has(cStr)) {
        catSet.add(cStr);
        cleanCats.push(c);
      }
    }
    this.categories = cleanCats;
  }

  // Deduplicate products
  if (Array.isArray(this.products)) {
    const prodSet = new Set();
    const cleanProds = [];
    for (const p of this.products) {
      if (!p) continue;
      const pStr = p._id ? p._id.toString() : p.toString();
      if (!prodSet.has(pStr)) {
        prodSet.add(pStr);
        cleanProds.push(p);
      }
    }
    this.products = cleanProds;
  }

  // Distribution Type conditional validation rules (safe for existing global coupons)
  if (this.distributionType === "selected_users") {
    if (!Array.isArray(this.assignedUsers) || this.assignedUsers.length === 0) {
      this.invalidate(
        "assignedUsers",
        "At least one user must be assigned for selected_users distribution"
      );
    }
  }

  if (this.distributionType === "inactive_user") {
    if (
      this.inactiveDays === undefined ||
      this.inactiveDays === null ||
      this.inactiveDays <= 0 ||
      !Number.isInteger(Number(this.inactiveDays))
    ) {
      this.invalidate(
        "inactiveDays",
        "Inactive days must be a positive integer greater than 0 for inactive_user distribution"
      );
    }
  }

  if (this.distributionType === "new_user") {
    if (this.newUserDays === undefined || this.newUserDays <= 0) {
      this.invalidate(
        "newUserDays",
        "New user days must be greater than 0 for new_user distribution"
      );
    }
  }

  if (this.distributionType === "user_group") {
    const rawGroup =
      this.eligibilityRules?.userGroup || this.eligibilityRules?.group;
    const cleanGroup = rawGroup ? String(rawGroup).trim() : "";
    const allowedGroups = [
      "all_users",
      "new_users",
      "returning_users",
      "frequent_buyers",
      "high_value_customers",
      "inactive_customers",
      "custom",
    ];

    if (!cleanGroup || !allowedGroups.includes(cleanGroup)) {
      this.invalidate(
        "eligibilityRules.userGroup",
        `Invalid user group: "${cleanGroup}". Allowed groups: ${allowedGroups.join(", ")}`
      );
    }

    if (cleanGroup === "frequent_buyers") {
      const minOrders = Number(this.eligibilityRules?.minimumOrders);
      if (
        this.eligibilityRules?.minimumOrders === undefined ||
        this.eligibilityRules?.minimumOrders === null ||
        isNaN(minOrders) ||
        minOrders <= 0 ||
        !Number.isInteger(minOrders)
      ) {
        this.invalidate(
          "eligibilityRules.minimumOrders",
          "Minimum orders must be a positive integer for frequent_buyers group"
        );
      }
    }

    if (cleanGroup === "high_value_customers") {
      const minSpend = Number(this.eligibilityRules?.minimumSpend);
      if (
        this.eligibilityRules?.minimumSpend === undefined ||
        this.eligibilityRules?.minimumSpend === null ||
        isNaN(minSpend) ||
        minSpend <= 0
      ) {
        this.invalidate(
          "eligibilityRules.minimumSpend",
          "Minimum spend must be greater than 0 for high_value_customers group"
        );
      }
    }

    // Keep group and userGroup in sync
    if (this.eligibilityRules) {
      if (cleanGroup) {
        this.eligibilityRules.userGroup = cleanGroup;
        this.eligibilityRules.group = cleanGroup;
      }
    }
  }

  if (this.distributionType === "category_based") {
    if (!Array.isArray(this.categories) || this.categories.length === 0) {
      this.invalidate(
        "categories",
        "At least one category is required for category_based distribution"
      );
    }
  }

  if (this.distributionType === "product_based") {
    if (!Array.isArray(this.products) || this.products.length === 0) {
      this.invalidate(
        "products",
        "At least one product is required for product_based distribution"
      );
    }
  }

  if (this.perUserLimit !== undefined && this.perUserLimit < 1) {
    this.invalidate("perUserLimit", "Per-user limit must be at least 1");
  }

  if (this.priority !== undefined && this.priority < 0) {
    this.invalidate("priority", "Priority cannot be negative");
  }

  if (this.eligibilityDuration !== undefined && this.eligibilityDuration < 0) {
    this.invalidate("eligibilityDuration", "Eligibility duration cannot be negative");
  }
});

couponSchema.index({ isActive: 1, expiryDate: 1 });
couponSchema.index({ distributionType: 1 });
couponSchema.index({ priority: -1, expiryDate: 1, createdAt: -1 });

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;
