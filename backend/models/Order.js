import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    size: {
      type: String,
      default: "",
    },

    color: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    houseBuilding: {
      type: String,
      required: true,
    },

    streetLocality: {
      type: String,
      required: true,
    },

    landmark: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      required: true,
    },

    cityState: {
      type: String,
      required: true,
    },

    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderItems: [orderItemSchema],

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "CARD", "UPI"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    stripePaymentIntentId: {
      type: String,
      default: "",
      index: true,
    },

    stripeRefundId: {
      type: String,
      default: "",
    },

    refundedAt: {
      type: Date,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "failed",
      ],
      default: "pending",
    },

    couponCode: {
      type: String,
      default: "",
    },

    deliveryOption: {
      type: String,
      enum: ["standard", "pickup"],
      default: "standard",
    },

    returnStatus: {
      type: String,
      enum: [
        "NONE",
        "REQUESTED",
        "APPROVED",
        "REJECTED",
        "PICKUP_SCHEDULED",
        "PICKED_UP",
        "RETURN_RECEIVED",
        "REFUND_PROCESSING",
        "REFUNDED",
        "CANCELLED",
      ],
      default: "NONE",
      index: true,
    },

    returnRequest: {
      requestedAt: {
        type: Date,
      },
      reason: {
        type: String,
        default: "",
      },
      details: {
        type: String,
        default: "",
      },
      items: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          name: {
            type: String,
            default: "",
          },
          image: {
            type: String,
            default: "",
          },
          price: {
            type: Number,
            default: 0,
          },
          quantity: {
            type: Number,
            default: 1,
          },
          size: {
            type: String,
            default: "",
          },
          color: {
            type: String,
            default: "",
          },
        },
      ],
      status: {
        type: String,
        enum: [
          "NONE",
          "REQUESTED",
          "APPROVED",
          "REJECTED",
          "PICKUP_SCHEDULED",
          "PICKED_UP",
          "RETURN_RECEIVED",
          "REFUND_PROCESSING",
          "REFUNDED",
          "CANCELLED",
        ],
        default: "NONE",
      },
      refundAmount: {
        type: Number,
        default: 0,
      },
      stripeRefundId: {
        type: String,
        default: "",
      },
      refundMethod: {
        type: String,
        enum: ["STRIPE", "COD_MANUAL", "NONE"],
        default: "NONE",
      },
      adminNote: {
        type: String,
        default: "",
      },
      processedAt: {
        type: Date,
      },
    },

    exchangeStatus: {
      type: String,
      enum: [
        "NONE",
        "REQUESTED",
        "APPROVED",
        "REJECTED",
        "PICKUP_SCHEDULED",
        "PICKED_UP",
        "RECEIVED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "NONE",
      index: true,
    },

    exchangeRequest: {
      requestedAt: {
        type: Date,
      },
      reason: {
        type: String,
        default: "",
      },
      details: {
        type: String,
        default: "",
      },
      items: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          name: {
            type: String,
            default: "",
          },
          image: {
            type: String,
            default: "",
          },
          price: {
            type: Number,
            default: 0,
          },
          quantity: {
            type: Number,
            default: 1,
          },
          originalSize: {
            type: String,
            default: "",
          },
          newSize: {
            type: String,
            default: "",
          },
          color: {
            type: String,
            default: "",
          },
          priceDifference: {
            type: Number,
            default: 0,
          },
        },
      ],
      status: {
        type: String,
        enum: [
          "NONE",
          "REQUESTED",
          "APPROVED",
          "REJECTED",
          "PICKUP_SCHEDULED",
          "PICKED_UP",
          "RECEIVED",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
        ],
        default: "NONE",
      },
      additionalPaymentRequired: {
        type: Number,
        default: 0,
      },
      refundDifference: {
        type: Number,
        default: 0,
      },
      adminNote: {
        type: String,
        default: "",
      },
      processedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
