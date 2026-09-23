import "dotenv/config";
import Stripe from "stripe";
import Order from "../models/Order.js";
import Cart from "../models/cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import { emitOrderUpdate } from "../socket/socketManager.js";
import { sendEmail } from "../utils/emailService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const createOrder = async (req, res) => {
  try {
    const {
      addressId,
      paymentMethod = "COD",
      deliveryOption = "standard",
    } = req.body;

    if (!addressId) {
      return res.status(400).json({
        message: "Address ID is required",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.id,
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          message: `${product.name} is currently unavailable`,
        });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          message: `${product.name} has only ${product.stock} items available`,
        });
      }

      const finalPrice =
        product.discountPrice > 0 ? product.discountPrice : product.price;

      const itemTotal = finalPrice * item.quantity;

      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        price: finalPrice,
        quantity: item.quantity,
        size: item.size || "",
        color: item.color || "",
      });
    }

    let deliveryCharge = 0;

    if (deliveryOption === "standard") {
      deliveryCharge = subtotal >= 999 ? 0 : 49;
    } else if (deliveryOption === "pickup") {
      deliveryCharge = 0;
    } else {
      return res.status(400).json({
        message: "Invalid delivery option",
      });
    }

    const discount = 0;

    const totalAmount = subtotal - discount + deliveryCharge;

    const order = await Order.create({
      user: req.user.id,
      orderItems,
      shippingAddress: {
        firstName: address.firstName,
        lastName: address.lastName,
        mobile: address.mobile,
        houseBuilding: address.houseBuilding,
        streetLocality: address.streetLocality,
        landmark: address.landmark,
        pincode: address.pincode,
        cityState: address.cityState,
        addressType: address.addressType,
      },
      subtotal,
      discount,
      deliveryCharge,
      totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      stripePaymentIntentId: "",
      couponCode: "",
      deliveryOption,
    });

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: {
          stock: -item.quantity,
        },
      });
    }

    cart.items = [];
    await cart.save();

    emitOrderUpdate("order_created", order);

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const confirmCODOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Order is already paid",
      });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        message: "Order is cancelled",
      });
    }

    order.paymentMethod = "COD";
    order.paymentStatus = "pending";
    order.orderStatus = "confirmed";

    await order.save();

    emitOrderUpdate("order_confirmed", order);

    return res.status(200).json({
      message: "COD order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Confirm COD Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const confirmOnlineOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = "ONLINE" } = req.body;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      paymentMethod.toUpperCase() === "UPI" ||
      paymentMethod.toUpperCase() === "CARD"
    ) {
      return res.status(400).json({
        message:
          "UPI and Card payments must be processed and verified through Stripe",
      });
    }

    order.paymentMethod = paymentMethod.toUpperCase();
    order.paymentStatus =
      paymentMethod.toUpperCase() === "COD" ? "pending" : "paid";
    order.orderStatus = "confirmed";

    await order.save();

    emitOrderUpdate("order_confirmed", order);

    return res.status(200).json({
      message: "Order payment confirmed successfully",
      order,
    });
  } catch (error) {
    console.error("Confirm Online Order Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.id,
    })
      .populate("orderItems.product", "name images")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate("orderItems.product", "name images brand");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      order,
    });
  } catch (error) {
    console.error("Get Order Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "pending" && order.orderStatus !== "confirmed") {
      return res.status(400).json({
        message: "This order cannot be cancelled as it is already being processed or delivered",
      });
    }

    // Handle online Stripe payment refund
    const isStripePaid =
      order.paymentStatus === "paid" &&
      Boolean(order.stripePaymentIntentId || (order.paymentMethod && order.paymentMethod !== "COD"));

    if (isStripePaid) {
      if (!order.stripePaymentIntentId) {
        return res.status(400).json({
          message:
            "PaymentIntent ID not found for this paid order. Please contact support.",
        });
      }

      if (order.stripeRefundId) {
        return res.status(400).json({
          message: "A refund has already been issued for this order.",
        });
      }

      let stripeRefund = null;
      try {
        stripeRefund = await stripe.refunds.create(
          {
            payment_intent: order.stripePaymentIntentId,
            reason: "requested_by_customer",
          },
          {
            idempotencyKey: `cancel_refund_${order._id.toString()}`,
          },
        );
      } catch (stripeErr) {
        console.error("Stripe Cancellation Refund Error:", stripeErr);
        return res.status(400).json({
          message: `Stripe refund failed: ${
            stripeErr.message || "Failed to process cancellation refund"
          }`,
        });
      }

      if (!stripeRefund || stripeRefund.status === "failed") {
        return res.status(400).json({
          message:
            "Stripe could not complete the refund transaction. Order status was not changed.",
        });
      }

      order.stripeRefundId = stripeRefund.id;
      order.refundedAt = new Date();
      order.refundAmount = Number(order.totalAmount || 0);
      order.paymentStatus = "refunded";
    } else if (order.paymentMethod === "COD") {
      // For COD: Order status = Cancelled, Payment remains pending (unpaid).
      order.paymentStatus = "pending";
    }

    // Restore stock for all products
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
        },
      });
    }

    order.orderStatus = "cancelled";

    await order.save();

    emitOrderUpdate("order_cancelled", order);

    // Send email notification (non-blocking)
    if (order.user?.email) {
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Your Decathlon Order #${order._id
            .toString()
            .slice(-8)
            .toUpperCase()} has been cancelled`,
          text: `Hello ${
            order.user.name || "Customer"
          },\n\nYour order #${order._id} has been cancelled successfully.\n${
            order.paymentStatus === "refunded"
              ? `A full refund of ₹${order.totalAmount} has been initiated to your original payment method (Refund ID: ${order.stripeRefundId}).`
              : "For Cash on Delivery orders, no payment was charged."
          }\n\nThank you,\nDecathlon Team`,
        });
      } catch (mailErr) {
        console.error("Cancellation email error:", mailErr.message);
      }
    }

    return res.status(200).json({
      message:
        order.paymentStatus === "refunded"
          ? "Order cancelled and Stripe refund initiated successfully."
          : "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("orderItems.product", "name images")
      .sort({
        createdAt: -1,
      });

    // Ensure deduplication by MongoDB _id
    const uniqueMap = new Map();
    for (const order of orders) {
      if (order && order._id) {
        const idStr = order._id.toString();
        if (!uniqueMap.has(idStr)) {
          uniqueMap.set(idStr, order);
        }
      }
    }
    const deduplicatedOrders = Array.from(uniqueMap.values());

    return res.status(200).json({
      count: deduplicatedOrders.length,
      orders: deduplicatedOrders,
    });
  } catch (error) {
    console.error("Get All Orders Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
      "failed",
    ];

    if (!status) {
      return res.status(400).json({
        message: "Order status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.orderStatus = status;

    // Automatically synchronize returnStatus and returnRequest
    if (order.returnStatus && order.returnStatus !== "NONE") {
      if (status === "refunded") {
        order.returnStatus = "REFUNDED";
        order.paymentStatus = "refunded";
        if (order.returnRequest) {
          order.returnRequest.status = "REFUNDED";
          order.returnRequest.processedAt = new Date();
        }
      } else if (status === "returned") {
        if (order.paymentStatus === "refunded") {
          order.returnStatus = "REFUNDED";
          if (order.returnRequest) {
            order.returnRequest.status = "REFUNDED";
          }
        } else {
          order.returnStatus = "APPROVED";
          if (order.returnRequest) {
            order.returnRequest.status = "APPROVED";
          }
        }
        if (order.returnRequest) {
          order.returnRequest.processedAt = new Date();
        }
      } else if (status === "delivered") {
        if (order.returnStatus === "REQUESTED") {
          order.returnStatus = "REJECTED";
          if (order.returnRequest) {
            order.returnRequest.status = "REJECTED";
            order.returnRequest.processedAt = new Date();
          }
        }
      }
    }

    await order.save();

    emitOrderUpdate("order_status_updated", order);

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];

    if (!paymentStatus) {
      return res.status(400).json({
        message: "Payment status is required",
      });
    }

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        message: "Invalid payment status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === "refunded") {
      const isStripe = Boolean(
        order.stripePaymentIntentId ||
        (order.paymentMethod && order.paymentMethod !== "COD")
      );
      if (
        isStripe &&
        !order.stripeRefundId &&
        !order.returnRequest?.stripeRefundId
      ) {
        return res.status(400).json({
          message:
            "Cannot manually mark Stripe-paid order as refunded. An actual Stripe refund must be created and confirmed via the Process Refund workflow.",
        });
      }

      if (order.returnStatus && order.returnStatus !== "NONE") {
        order.returnStatus = "REFUNDED";
        if (order.returnRequest) {
          order.returnRequest.status = "REFUNDED";
          order.returnRequest.processedAt = new Date();
        }
      }
      order.orderStatus = "returned";
    }

    await order.save();

    emitOrderUpdate("order_payment_status_updated", order);

    return res.status(200).json({
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Payment Status Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/*
  ========================================
  USER - REQUEST ORDER RETURN
  ========================================
*/
const requestOrderReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, reason, details } = req.body;

    // Securely find order belonging to authenticated user first
    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found or does not belong to your account",
      });
    }

    const VALID_RETURN_REASONS = [
      "Product damaged",
      "Wrong product received",
      "Product doesn't fit",
      "Product quality issue",
      "Product not as expected",
      "Changed my mind",
      "Other",
    ];

    if (!reason || !VALID_RETURN_REASONS.includes(reason.trim())) {
      return res.status(400).json({
        message: "Please select a valid return reason from the list",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Please select at least one product to return",
      });
    }

    // Eligibility check 1: Status must not be cancelled, refunded, or failed
    if (["cancelled", "refunded", "failed"].includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Order cannot be returned because its status is ${order.orderStatus}`,
      });
    }

    // Eligibility check 2: Only delivered orders can be returned
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        message: "Only delivered orders are eligible for return",
      });
    }

    // Eligibility check 3: Cannot already have an active return request
    if (
      order.returnStatus &&
      order.returnStatus !== "NONE" &&
      order.returnStatus !== "REJECTED" &&
      order.returnStatus !== "CANCELLED"
    ) {
      return res.status(400).json({
        message: "A return request is already in progress or completed for this order",
      });
    }

    // Eligibility check 4: Return window check (strictly 7 days from delivery or order date)
    const returnWindowDays = Number(process.env.RETURN_WINDOW_DAYS) || 7;
    const baseTimestamp = order.deliveredAt
      ? new Date(order.deliveredAt).getTime()
      : new Date(order.createdAt).getTime();
    const expiryTimestamp =
      baseTimestamp + returnWindowDays * 24 * 60 * 60 * 1000;

    if (Date.now() > expiryTimestamp) {
      return res.status(400).json({
        message: `Return window of ${returnWindowDays} days has expired for this order`,
      });
    }

    // Validate returned items against order items
    const returnItemsList = [];
    let calculatedRefundAmount = 0;

    for (const reqItem of items) {
      const targetProductId = (
        reqItem.productId ||
        reqItem.product ||
        ""
      ).toString();

      const matchedOrderItem = order.orderItems.find(
        (oi) =>
          oi.product?.toString() === targetProductId ||
          oi.product?._id?.toString() === targetProductId,
      );

      if (!matchedOrderItem) {
        return res.status(400).json({
          message: "One or more selected products do not belong to this order",
        });
      }

      const returnQty = Number(reqItem.quantity) || 1;
      if (returnQty < 1) {
        return res.status(400).json({
          message: `Invalid return quantity for ${matchedOrderItem.name}`,
        });
      }

      if (returnQty > matchedOrderItem.quantity) {
        return res.status(400).json({
          message: `Requested return quantity (${returnQty}) exceeds purchased quantity (${matchedOrderItem.quantity}) for ${matchedOrderItem.name}`,
        });
      }

      calculatedRefundAmount += matchedOrderItem.price * returnQty;

      returnItemsList.push({
        product: matchedOrderItem.product,
        name: matchedOrderItem.name,
        image: matchedOrderItem.image || "",
        price: matchedOrderItem.price,
        quantity: returnQty,
        size: matchedOrderItem.size || "",
        color: matchedOrderItem.color || "",
      });
    }

    // Save return request
    order.returnStatus = "REQUESTED";
    order.returnRequest = {
      requestedAt: new Date(),
      reason: reason.trim(),
      details: (details || "").trim(),
      items: returnItemsList,
      status: "REQUESTED",
      refundAmount: calculatedRefundAmount,
      refundMethod: order.paymentMethod === "COD" ? "COD_MANUAL" : "STRIPE",
      stripeRefundId: "",
      adminNote: "",
      processedAt: null,
    };

    await order.save();

    emitOrderUpdate("order_return_requested", order);

    // Send email notification to customer (non-blocking)
    if (order.user?.email) {
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Return Request Submitted for Order #${order._id
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          text: `Hello ${
            order.user.name || "Customer"
          },\n\nWe have received your return request for ${
            returnItemsList.length
          } item(s).\nReason: ${reason}\nEstimated Refund: ₹${calculatedRefundAmount}\n\nOur team is reviewing your request and will schedule a pickup soon.\n\nThank you,\nDecathlon Team`,
        });
      } catch (mailErr) {
        console.error("Return request email error:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: "Your return request has been submitted successfully.",
      order,
    });
  } catch (error) {
    console.error("Request Order Return Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to submit return request",
    });
  }
};

/*
  ========================================
  ADMIN - UPDATE ORDER RETURN STATUS
  ========================================
*/
const updateOrderReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnStatus, adminNote } = req.body;

    const allowedReturnStatuses = [
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
    ];

    if (!returnStatus || !allowedReturnStatuses.includes(returnStatus)) {
      return res.status(400).json({
        message: "Invalid return status",
      });
    }

    const order = await Order.findById(id).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Safety: If setting to REFUNDED for online Stripe order, verify a Stripe refund exists or use processReturnRefund
    if (
      returnStatus === "REFUNDED" &&
      order.paymentMethod !== "COD" &&
      (order.paymentMethod === "CARD" || order.paymentMethod === "UPI" || order.paymentStatus === "paid") &&
      !order.returnRequest?.stripeRefundId
    ) {
      return res.status(400).json({
        message:
          "Cannot set status to REFUNDED for online Stripe order without creating the actual Stripe refund. Please use the 'Process Refund' action.",
      });
    }

    order.returnStatus = returnStatus;

    if (!order.returnRequest) {
      order.returnRequest = {
        requestedAt: new Date(),
        reason: "Administrative Action",
        details: "",
        items: [],
        status: returnStatus,
        refundAmount: 0,
        refundMethod: order.paymentMethod === "COD" ? "COD_MANUAL" : "STRIPE",
        stripeRefundId: "",
      };
    }

    order.returnRequest.status = returnStatus;
    if (adminNote !== undefined) {
      order.returnRequest.adminNote = adminNote;
    }
    order.returnRequest.processedAt = new Date();

    if (returnStatus === "REFUNDED") {
      order.orderStatus = "returned";
      order.paymentStatus = "refunded";
    }

    await order.save();

    emitOrderUpdate("order_return_status_updated", order);

    // Send customer email update (non-blocking)
    if (order.user?.email) {
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Return Status Update for Order #${order._id
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          text: `Hello ${
            order.user.name || "Customer"
          },\n\nYour return status has been updated to: ${returnStatus.replace(
            /_/g,
            " ",
          )}.\n${adminNote ? `Admin Note: ${adminNote}\n` : ""}\nThank you,\nDecathlon Team`,
        });
      } catch (mailErr) {
        console.error("Return update email error:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: "Return status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Order Return Status Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update return status",
    });
  }
};

/*
  ========================================
  ADMIN - PROCESS RETURN REFUND (STRIPE / COD)
  ========================================
*/
const processReturnRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote = "" } = req.body;

    const order = await Order.findById(id).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      !order.returnRequest ||
      !order.returnRequest.items ||
      order.returnRequest.items.length === 0
    ) {
      return res.status(400).json({
        message: "No active return request items found for this order",
      });
    }

    if (
      order.returnStatus === "REFUNDED" ||
      order.returnRequest.status === "REFUNDED"
    ) {
      return res.status(400).json({
        message: "Refund has already been completed for this return request",
      });
    }

    const refundAmount =
      Number(order.returnRequest.refundAmount) > 0
        ? Number(order.returnRequest.refundAmount)
        : Number(order.totalAmount || 0);

    if (refundAmount <= 0) {
      return res.status(400).json({
        message: "Invalid refund amount for this return request",
      });
    }

    // ONLINE STRIPE FLOW
    const isStripePaid =
      order.paymentStatus === "paid" &&
      Boolean(order.stripePaymentIntentId || (order.paymentMethod && order.paymentMethod !== "COD"));

    if (isStripePaid) {
      if (!order.stripePaymentIntentId) {
        return res.status(400).json({
          message: "Order does not have a valid Stripe PaymentIntent ID",
        });
      }

      if (order.returnRequest.stripeRefundId) {
        return res.status(400).json({
          message: `Stripe refund already exists: ${order.returnRequest.stripeRefundId}`,
        });
      }

      const refundAmountPaise = Math.round(refundAmount * 100);
      let stripeRefund = null;

      try {
        stripeRefund = await stripe.refunds.create(
          {
            payment_intent: order.stripePaymentIntentId,
            amount: refundAmountPaise,
            reason: "requested_by_customer",
          },
          {
            idempotencyKey: `return_refund_${order._id.toString()}_${
              order.returnRequest.requestedAt?.getTime() || Date.now()
            }`,
          },
        );
      } catch (stripeErr) {
        console.error("Stripe Return Refund Error:", stripeErr);
        return res.status(400).json({
          message: `Stripe refund creation failed: ${
            stripeErr.message || "Stripe refund error"
          }`,
        });
      }

      if (!stripeRefund || stripeRefund.status === "failed") {
        return res.status(400).json({
          message:
            "Stripe could not process the refund for this return request.",
        });
      }

      order.returnStatus = "REFUNDED";
      order.returnRequest.status = "REFUNDED";
      order.returnRequest.stripeRefundId = stripeRefund.id;
      order.returnRequest.refundMethod = "STRIPE";
      order.returnRequest.processedAt = new Date();
      if (adminNote) order.returnRequest.adminNote = adminNote;

      order.stripeRefundId = stripeRefund.id;
      order.refundedAt = new Date();
      order.refundAmount = refundAmount;
      order.paymentStatus = "refunded";
      order.orderStatus = "returned";

      // Restore returned items stock
      for (const rItem of order.returnRequest.items) {
        if (rItem.product) {
          await Product.findByIdAndUpdate(rItem.product, {
            $inc: { stock: rItem.quantity },
          });
        }
      }

      await order.save();
      emitOrderUpdate("order_return_status_updated", order);

      // Email customer
      if (order.user?.email) {
        try {
          await sendEmail({
            to: order.user.email,
            subject: `Refund processed for your Decathlon Order #${order._id
              .toString()
              .slice(-8)
              .toUpperCase()}`,
            text: `Hello ${
              order.user.name || "Customer"
            },\n\nYour return refund of ₹${refundAmount} has been processed successfully via Stripe.\nStripe Refund ID: ${
              stripeRefund.id
            }\nThe amount will reflect in your account within 5-7 business days.\n\nThank you,\nDecathlon Team`,
          });
        } catch (mailErr) {
          console.error("Refund email error:", mailErr.message);
        }
      }

      return res.status(200).json({
        message: "Stripe refund processed successfully.",
        order,
        refund: stripeRefund,
      });
    }

    // COD FLOW (Manual Refund)
    if (order.paymentMethod === "COD") {
      order.returnStatus = "REFUNDED";
      order.returnRequest.status = "REFUNDED";
      order.returnRequest.refundMethod = "COD_MANUAL";
      order.returnRequest.processedAt = new Date();
      order.returnRequest.adminNote =
        adminNote || "COD cash/bank refund processed manually by admin.";

      order.refundedAt = new Date();
      order.refundAmount = refundAmount;
      order.paymentStatus = "refunded";
      order.orderStatus = "returned";

      // Restore returned items stock
      for (const rItem of order.returnRequest.items) {
        if (rItem.product) {
          await Product.findByIdAndUpdate(rItem.product, {
            $inc: { stock: rItem.quantity },
          });
        }
      }

      await order.save();
      emitOrderUpdate("order_return_status_updated", order);

      // Email customer
      if (order.user?.email) {
        try {
          await sendEmail({
            to: order.user.email,
            subject: `COD Refund completed for Decathlon Order #${order._id
              .toString()
              .slice(-8)
              .toUpperCase()}`,
            text: `Hello ${
              order.user.name || "Customer"
            },\n\nYour COD return refund of ₹${refundAmount} has been completed.\nNote: ${
              order.returnRequest.adminNote
            }\n\nThank you,\nDecathlon Team`,
          });
        } catch (mailErr) {
          console.error("COD refund email error:", mailErr.message);
        }
      }

      return res.status(200).json({
        message: "COD refund marked as completed successfully.",
        order,
      });
    }

    return res.status(400).json({
      message: "Unsupported payment method for refund processing.",
    });
  } catch (error) {
    console.error("Process Return Refund Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to process refund",
    });
  }
};

/*
  ========================================
  USER - REQUEST ORDER EXCHANGE
  ========================================
*/
const requestOrderExchange = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productId,
      quantity = 1,
      currentSize = "",
      newSize,
      reason,
      details = "",
    } = req.body;

    const VALID_EXCHANGE_REASONS = [
      "Wrong size",
      "Wrong product",
      "Damaged product",
      "Product quality issue",
      "Other",
    ];

    if (!reason || !VALID_EXCHANGE_REASONS.includes(reason.trim())) {
      return res.status(400).json({
        message: "Please select a valid exchange reason",
      });
    }

    if (!newSize || !newSize.trim()) {
      return res.status(400).json({
        message: "Please select a replacement size",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found or does not belong to your account",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        message: "Only delivered orders are eligible for exchange",
      });
    }

    if (
      order.exchangeStatus &&
      order.exchangeStatus !== "NONE" &&
      order.exchangeStatus !== "REJECTED" &&
      order.exchangeStatus !== "CANCELLED"
    ) {
      return res.status(400).json({
        message: "An exchange request is already active for this order",
      });
    }

    // 7-day window check
    const returnWindowDays = Number(process.env.RETURN_WINDOW_DAYS) || 7;
    const baseTimestamp = order.deliveredAt
      ? new Date(order.deliveredAt).getTime()
      : new Date(order.createdAt).getTime();
    const expiryTimestamp =
      baseTimestamp + returnWindowDays * 24 * 60 * 60 * 1000;

    if (Date.now() > expiryTimestamp) {
      return res.status(400).json({
        message: `Exchange window of ${returnWindowDays} days has expired for this order`,
      });
    }

    // Match order item
    const targetProductId = (productId || "").toString();
    const matchedOrderItem = order.orderItems.find(
      (oi) =>
        oi.product?.toString() === targetProductId ||
        oi.product?._id?.toString() === targetProductId,
    );

    if (!matchedOrderItem) {
      return res.status(400).json({
        message: "Selected product does not belong to this order",
      });
    }

    const exchangeQty = Number(quantity) || 1;
    if (exchangeQty < 1 || exchangeQty > matchedOrderItem.quantity) {
      return res.status(400).json({
        message: `Invalid exchange quantity (${exchangeQty}). You purchased ${matchedOrderItem.quantity}.`,
      });
    }

    // Validate replacement product & size
    const product = await Product.findById(matchedOrderItem.product);
    if (!product || !product.isActive) {
      return res.status(400).json({
        message: "The requested product is currently unavailable for exchange",
      });
    }

    const availableSizes = Array.isArray(product.size) ? product.size : [];
    const sizeExists = availableSizes.some(
      (s) => s.trim().toLowerCase() === newSize.trim().toLowerCase(),
    );

    if (!sizeExists) {
      return res.status(400).json({
        message: `Size '${newSize}' is not offered for this product`,
      });
    }

    if (product.stock < exchangeQty) {
      return res.status(400).json({
        message: `Size '${newSize}' is currently out of stock`,
      });
    }

    // Price difference calculation
    const originalPrice = matchedOrderItem.price * exchangeQty;
    const replacementUnitPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;
    const replacementTotalPrice = replacementUnitPrice * exchangeQty;
    const difference = replacementTotalPrice - originalPrice;

    const additionalPaymentRequired = difference > 0 ? difference : 0;
    const refundDifference = difference < 0 ? Math.abs(difference) : 0;

    order.exchangeStatus = "REQUESTED";
    order.exchangeRequest = {
      requestedAt: new Date(),
      reason: reason.trim(),
      details: (details || "").trim(),
      items: [
        {
          product: product._id,
          name: product.name,
          image: product.images?.[0] || matchedOrderItem.image || "",
          price: matchedOrderItem.price,
          quantity: exchangeQty,
          originalSize: currentSize || matchedOrderItem.size || "",
          newSize: newSize.trim(),
          color: matchedOrderItem.color || "",
          priceDifference: difference,
        },
      ],
      status: "REQUESTED",
      additionalPaymentRequired,
      refundDifference,
      adminNote: "",
      processedAt: null,
    };

    await order.save();
    emitOrderUpdate("order_exchange_requested", order);

    // Send confirmation email
    if (order.user?.email) {
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Exchange Requested for Decathlon Order #${order._id
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          text: `Hello ${
            order.user.name || "Customer"
          },\n\nWe have received your exchange request for ${
            product.name
          } (New Size: ${newSize}).\nReason: ${reason}\n\nOur team will review and schedule pickup shortly.\n\nThank you,\nDecathlon Team`,
        });
      } catch (mailErr) {
        console.error("Exchange email error:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: "Exchange request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Request Order Exchange Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to submit exchange request",
    });
  }
};

/*
  ========================================
  ADMIN - UPDATE ORDER EXCHANGE STATUS
  ========================================
*/
const updateOrderExchangeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { exchangeStatus, adminNote } = req.body;

    const allowedExchangeStatuses = [
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
    ];

    if (!exchangeStatus || !allowedExchangeStatuses.includes(exchangeStatus)) {
      return res.status(400).json({
        message: "Invalid exchange status",
      });
    }

    const order = await Order.findById(id).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.exchangeStatus = exchangeStatus;

    if (!order.exchangeRequest) {
      order.exchangeRequest = {
        requestedAt: new Date(),
        reason: "Administrative Action",
        details: "",
        items: [],
        status: exchangeStatus,
        additionalPaymentRequired: 0,
        refundDifference: 0,
      };
    }

    order.exchangeRequest.status = exchangeStatus;
    if (adminNote !== undefined) {
      order.exchangeRequest.adminNote = adminNote;
    }
    order.exchangeRequest.processedAt = new Date();

    await order.save();
    emitOrderUpdate("order_exchange_status_updated", order);

    // Send email notification to customer
    if (order.user?.email) {
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Update on Exchange for Order #${order._id
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          text: `Hello ${
            order.user.name || "Customer"
          },\n\nYour exchange status has been updated to: ${exchangeStatus.replace(
            /_/g,
            " ",
          )}.\n${adminNote ? `Note: ${adminNote}\n` : ""}\nThank you,\nDecathlon Team`,
        });
      } catch (mailErr) {
        console.error("Exchange status email error:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: "Exchange status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Order Exchange Status Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update exchange status",
    });
  }
};

export {
  createOrder,
  confirmCODOrder,
  confirmOnlineOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  requestOrderReturn,
  updateOrderReturnStatus,
  processReturnRefund,
  requestOrderExchange,
  updateOrderExchangeStatus,
};
