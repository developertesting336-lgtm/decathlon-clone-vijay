import "dotenv/config";
import mongoose from "mongoose";
import Stripe from "stripe";
import Order from "../models/Order.js";
import Cart from "../models/cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import {
  emitOrderUpdate,
  emitTrackingUpdateToUser,
  emitPaymentStatusToUser,
} from "../socket/socketManager.js";
import Notification from "../models/Notification.js";
import { sendEmail } from "../utils/emailService.js";
import {
  sendNotification,
  sendAdminNotification,
  checkAndNotifyLowStock,
} from "../services/notificationService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const TRACKING_FLOW = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "REACHED_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const generateUniqueTrackingNumber = async () => {
  let isUnique = false;
  let trackingNumber = "";
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    attempts++;
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    trackingNumber = `DCL${randomDigits}`;
    const existing = await Order.findOne({ trackingNumber });
    if (!existing) {
      isUnique = true;
    }
  }
  return trackingNumber;
};

const getDefaultDescription = (status) => {
  switch (status) {
    case "ORDER_PLACED":
      return "Order placed successfully";
    case "CONFIRMED":
      return "Order confirmed and processed";
    case "PACKED":
      return "Package has been packed and prepared for dispatch";
    case "SHIPPED":
      return "Package has been shipped and is in transit";
    case "REACHED_HUB":
      return "Package has arrived at courier delivery hub";
    case "OUT_FOR_DELIVERY":
      return "Package is out for delivery with the delivery agent";
    case "DELIVERED":
      return "Package has been delivered successfully";
    default:
      return `Tracking status updated to ${status}`;
  }
};

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

    const trackingNumber = await generateUniqueTrackingNumber();
    const demoDeliveryDate = new Date();
    demoDeliveryDate.setDate(demoDeliveryDate.getDate() + 5);

    const initialLocation = {
      city: "Central Fulfillment Hub, Bengaluru",
      latitude: 12.9716,
      longitude: 77.5946,
    };

    const initialHistory = [
      {
        status: "ORDER_PLACED",
        location: "Order Processing",
        description: "Order placed successfully",
        timestamp: new Date(),
      },
    ];

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
      trackingNumber,
      carrier: "Decathlon Demo Logistics",
      estimatedDeliveryDate: demoDeliveryDate,
      currentLocation: initialLocation,
      trackingHistory: initialHistory,
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

    const shortId = order._id.toString().slice(-8).toUpperCase();
    sendAdminNotification({
      title: "New Order Received",
      body: `New order #${shortId} received for ₹${order.totalAmount}.`,
      type: "ORDER",
      url: "/orders",
      orderId: order._id,
    });

    // Check low stock for ordered items
    for (const item of orderItems) {
      if (item.product) {
        checkAndNotifyLowStock(item.product);
      }
    }

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

    const shortId = order._id.toString().slice(-8).toUpperCase();
    sendNotification({
      userId: order.user,
      title: "Order Confirmed",
      body: `Your order #${shortId} has been confirmed.`,
      type: "ORDER",
      url: "/account/orders-returns?tab=order-returns",
      orderId: order._id,
    });

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

    const shortId = order._id.toString().slice(-8).toUpperCase();
    sendNotification({
      userId: order.user,
      title: "Order Confirmed",
      body: `Your order #${shortId} has been confirmed.`,
      type: "ORDER",
      url: "/account/orders-returns?tab=order-returns",
      orderId: order._id,
    });

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
    order.cancelledAt = new Date();
    order.cancellationReason =
      req.body?.reason || req.body?.cancellationReason || "Cancelled by customer";

    const hasCancelledEntry = (order.trackingHistory || []).some(
      (h) => h.status === "CANCELLED"
    );
    if (!hasCancelledEntry) {
      order.trackingHistory = order.trackingHistory || [];
      order.trackingHistory.push({
        status: "CANCELLED",
        location: "Not Applicable",
        description: order.cancellationReason,
        timestamp: order.cancelledAt,
      });
    }

    await order.save();

    emitOrderUpdate("order_cancelled", order);
    emitOrderUpdate("order_updated", order);
    emitTrackingUpdateToUser(order.user?._id || order.user, {
      orderId: order._id,
      status: "CANCELLED",
      orderStatus: "cancelled",
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      timestamp: order.cancelledAt,
    });

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // Notify customer about cancellation
    sendNotification({
      userId: order.user?._id || order.user,
      title: "Order Cancelled",
      body: `Your order #${shortId} has been cancelled.`,
      type: "ORDER",
      url: "/account/orders-returns?tab=order-returns",
      orderId: order._id,
    });

    // Notify customer if refund was completed
    if (order.paymentStatus === "refunded") {
      sendNotification({
        userId: order.user?._id || order.user,
        title: "Refund Completed",
        body: `Your refund for Order #${shortId} has been completed.`,
        type: "REFUND",
        url: "/account/orders-returns?tab=order-returns",
        orderId: order._id,
      });
    }

    // Notify Admin of cancelled order
    sendAdminNotification({
      title: "Order Cancelled",
      body: `Order #${shortId} was cancelled by the customer.`,
      type: "ORDER",
      url: "/orders",
      orderId: order._id,
    });

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

    const oldStatus = order.orderStatus;

    if (status === "delivered") {
      const currentTrackingStatus =
        order.trackingHistory && order.trackingHistory.length > 0
          ? order.trackingHistory[order.trackingHistory.length - 1].status
          : "ORDER_PLACED";
      if (currentTrackingStatus !== "OUT_FOR_DELIVERY" && currentTrackingStatus !== "DELIVERED") {
        return res.status(400).json({
          success: false,
          message: `Invalid status progression: cannot transition from ${currentTrackingStatus} to DELIVERED. Order must be OUT_FOR_DELIVERY before it can be marked as delivered.`,
        });
      }
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      const hasDelivered = order.trackingHistory?.some((h) => h.status === "DELIVERED");
      if (!hasDelivered) {
        order.trackingHistory.push({
          status: "DELIVERED",
          location: order.currentLocation?.city || order.shippingAddress?.cityState || "Delivered",
          description: "Order delivered successfully",
          timestamp: order.deliveredAt,
        });
      }
    }

    if (status === "cancelled") {
      order.cancelledAt = order.cancelledAt || new Date();
      order.cancellationReason =
        req.body?.cancellationReason ||
        req.body?.reason ||
        order.cancellationReason ||
        "Order cancelled by administrator";

      const hasCancelled = (order.trackingHistory || []).some(
        (h) => h.status === "CANCELLED"
      );
      if (!hasCancelled) {
        order.trackingHistory = order.trackingHistory || [];
        order.trackingHistory.push({
          status: "CANCELLED",
          location: "Not Applicable",
          description: order.cancellationReason,
          timestamp: order.cancelledAt,
        });
      }
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

    // Notify customer only when status changes
    if (oldStatus !== status) {
      const shortId = order._id.toString().slice(-8).toUpperCase();
      const statusTitle = `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`;

      sendNotification({
        userId: order.user,
        title: statusTitle,
        body: `Your order #${shortId} is now ${status}.`,
        type: "ORDER",
        url: "/account/orders-returns?tab=order-returns",
        orderId: order._id,
      });
    }

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      });
    }

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 1. COD PAYMENT CONFIRMATION FLOW
    if (paymentStatus === "paid") {
      // Backend must verify the order payment method is COD
      if (order.paymentMethod !== "COD") {
        return res.status(400).json({
          success: false,
          message: "Cannot mark non-COD order payment status via this endpoint. Stripe/online payments are verified via payment gateway.",
        });
      }

      // Prevent duplicate payment confirmation: If payment is already PAID, reject the request.
      if (order.paymentStatus === "paid") {
        return res.status(400).json({
          success: false,
          message: "Payment has already been marked as paid.",
        });
      }

      // Backend must verify paymentStatus === pending
      if (order.paymentStatus !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Cannot mark payment as paid when payment status is ${order.paymentStatus}.`,
        });
      }

      const receivedAt = new Date();
      order.paymentStatus = "paid";
      order.paymentReceivedAt = receivedAt;
      order.paidAt = receivedAt;

      await order.save();

      // Emit customer-specific event and broadcast
      const paymentPayload = {
        orderId: order._id,
        paymentMethod: "COD",
        paymentStatus: "paid",
        timestamp: receivedAt,
      };
      emitPaymentStatusToUser(order.user, paymentPayload);
      emitOrderUpdate("payment_status_updated", paymentPayload);
      emitOrderUpdate("order_payment_status_updated", order);
      emitOrderUpdate("order_updated", order);

      // Web Push & persistent notification (prevent duplicates)
      const existingCodNotif = await Notification.findOne({
        recipient: order.user,
        order: order._id,
        title: "COD Payment Confirmed",
      });
      if (!existingCodNotif) {
        await sendNotification({
          userId: order.user,
          title: "COD Payment Confirmed",
          body: "COD payment for your order has been marked as received.",
          type: "ORDER",
          url: "/account/orders-returns?tab=order-returns",
          orderId: order._id,
        });
      }

      return res.status(200).json({
        success: true,
        message: "COD payment marked as received successfully",
        order,
      });
    }

    // 2. REFUND STATUS FLOW
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
          success: false,
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
      order.paymentStatus = "refunded";
      order.refundedAt = new Date();

      await order.save();

      emitOrderUpdate("order_payment_status_updated", order);
      emitOrderUpdate("order_updated", order);

      return res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
        order,
      });
    }

    // 3. OTHER PAYMENT STATUSES (e.g. failed, pending)
    order.paymentStatus = paymentStatus;
    await order.save();

    emitOrderUpdate("order_payment_status_updated", order);
    emitOrderUpdate("order_updated", order);

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update Payment Status Error:", error);

    return res.status(500).json({
      success: false,
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

    // Eligibility check 3: Cannot already have an active return or exchange request
    if (
      order.returnStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.returnStatus)
    ) {
      return res.status(400).json({
        message: "A return request is already in progress or completed for this order",
      });
    }

    if (
      order.exchangeStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.exchangeStatus)
    ) {
      return res.status(400).json({
        message: "An exchange request is currently active for this order. Please conclude the exchange before requesting a return.",
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

    const returnShortId = order._id.toString().slice(-8).toUpperCase();
    sendAdminNotification({
      title: "New Return Request",
      body: `Return request received for Order #${returnShortId}.`,
      type: "RETURN",
      url: "/orders?tab=returns",
      orderId: order._id,
    });

    // Send email notification to customer (non-blocking)
    if (order.user?.email) {
      sendEmail({
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
      }).catch((mailErr) => console.error("Return request email error:", mailErr.message));
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

    const currentReturnStatus = order.returnStatus || "NONE";

    // Strict transition validation
    const VALID_RETURN_TRANSITIONS = {
      NONE: ["REQUESTED"],
      REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["PICKUP_SCHEDULED", "CANCELLED"],
      PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
      PICKED_UP: ["RETURN_RECEIVED", "CANCELLED"],
      RETURN_RECEIVED: ["REFUND_PROCESSING", "REFUNDED", "CANCELLED"],
      REFUND_PROCESSING: ["REFUNDED", "CANCELLED"],
      REFUNDED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    if (
      currentReturnStatus !== returnStatus &&
      VALID_RETURN_TRANSITIONS[currentReturnStatus] &&
      !VALID_RETURN_TRANSITIONS[currentReturnStatus].includes(returnStatus)
    ) {
      return res.status(400).json({
        message: `Invalid return status transition from ${currentReturnStatus} to ${returnStatus}.`,
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

    const oldReturnStatus = order.returnStatus;
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
        stockRestored: false,
      };
    }

    order.returnRequest.status = returnStatus;
    if (adminNote !== undefined) {
      order.returnRequest.adminNote = adminNote;
    }
    order.returnRequest.processedAt = new Date();

    // Restock returned items if received and not yet restored
    if (returnStatus === "RETURN_RECEIVED" && !order.returnRequest.stockRestored) {
      if (order.returnRequest.items && order.returnRequest.items.length > 0) {
        for (const rItem of order.returnRequest.items) {
          if (rItem.product) {
            await Product.findByIdAndUpdate(rItem.product, {
              $inc: { stock: rItem.quantity },
            });
          }
        }
      }
      order.returnRequest.stockRestored = true;
    }

    if (returnStatus === "REFUNDED") {
      order.orderStatus = "returned";
      order.paymentStatus = "refunded";
    }

    await order.save();

    emitOrderUpdate("order_return_status_updated", order);

    // Notify customer only if return status actually changed
    if (oldReturnStatus !== returnStatus) {
      const shortId = order._id.toString().slice(-8).toUpperCase();
      const returnNotificationMap = {
        APPROVED: {
          title: "Return Approved",
          body: `Your return request for Order #${shortId} has been approved.`,
        },
        PICKUP_SCHEDULED: {
          title: "Return Pickup Scheduled",
          body: `Return pickup has been scheduled for Order #${shortId}.`,
        },
        PICKED_UP: {
          title: "Return Picked Up",
          body: `Your returned items for Order #${shortId} have been picked up.`,
        },
        RETURN_RECEIVED: {
          title: "Returned Product Received",
          body: `Your returned items for Order #${shortId} have been received and verified.`,
        },
        REFUND_PROCESSING: {
          title: "Refund Processing",
          body: `Your refund for Order #${shortId} is being processed.`,
        },
        REFUNDED: {
          title: "Refund Completed",
          body: `Your refund for Order #${shortId} has been completed.`,
        },
        REJECTED: {
          title: "Return Rejected",
          body: `Your return request for Order #${shortId} has been rejected.`,
        },
        CANCELLED: {
          title: "Return Cancelled",
          body: `The return request for Order #${shortId} has been cancelled.`,
        },
      };

      const notifData = returnNotificationMap[returnStatus] || {
        title: `Return ${returnStatus.replace(/_/g, " ")}`,
        body: `Your return request for Order #${shortId} is now ${returnStatus.replace(/_/g, " ").toLowerCase()}.`,
      };

      sendNotification({
        userId: order.user?._id || order.user,
        title: notifData.title,
        body: notifData.body,
        type: returnStatus === "REFUND_PROCESSING" || returnStatus === "REFUNDED" ? "REFUND" : "RETURN",
        url: "/account/orders-returns?tab=order-returns",
        orderId: order._id,
      });
    }

    // Send customer email update (non-blocking)
    if (order.user?.email) {
      sendEmail({
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
      }).catch((mailErr) => console.error("Return update email error:", mailErr.message));
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

    // Stage validation: Refund can only happen once return is received or processing refund
    if (!["RETURN_RECEIVED", "REFUND_PROCESSING"].includes(order.returnStatus)) {
      return res.status(400).json({
        message: `Refund can only be processed after returned items are received. Current return status: ${order.returnStatus}`,
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

    // CHECK PAYMENT METHOD
    const isCod = order.paymentMethod === "COD" || order.returnRequest?.refundMethod === "COD_MANUAL";

    // 1. COD FLOW (Manual Cash / Bank Transfer Refund) - NEVER call Stripe
    if (isCod) {
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

      // Restore returned items stock if not yet restored
      if (!order.returnRequest.stockRestored && order.returnRequest.items) {
        for (const rItem of order.returnRequest.items) {
          if (rItem.product) {
            await Product.findByIdAndUpdate(rItem.product, {
              $inc: { stock: rItem.quantity },
            });
          }
        }
        order.returnRequest.stockRestored = true;
      }

      await order.save();
      emitOrderUpdate("order_return_status_updated", order);

      const codRefundShortId = order._id.toString().slice(-8).toUpperCase();
      sendNotification({
        userId: order.user?._id || order.user,
        title: "Refund Completed",
        body: `Your refund for Order #${codRefundShortId} has been completed.`,
        type: "REFUND",
        url: "/account/orders-returns?tab=order-returns",
        orderId: order._id,
      });

      // Email customer non-blocking
      if (order.user?.email) {
        sendEmail({
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
        }).catch((mailErr) => console.error("COD refund email error:", mailErr.message));
      }

      return res.status(200).json({
        message: "COD refund marked as completed successfully.",
        order,
      });
    }

    // 2. ONLINE STRIPE FLOW
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

    // Restore returned items stock if not yet restored
    if (!order.returnRequest.stockRestored && order.returnRequest.items) {
      for (const rItem of order.returnRequest.items) {
        if (rItem.product) {
          await Product.findByIdAndUpdate(rItem.product, {
            $inc: { stock: rItem.quantity },
          });
        }
      }
      order.returnRequest.stockRestored = true;
    }

    await order.save();
    emitOrderUpdate("order_return_status_updated", order);

    const stripeRefundShortId = order._id.toString().slice(-8).toUpperCase();
    sendNotification({
      userId: order.user?._id || order.user,
      title: "Refund Completed",
      body: `Your refund for Order #${stripeRefundShortId} has been completed.`,
      type: "REFUND",
      url: "/account/orders-returns?tab=order-returns",
      orderId: order._id,
    });

    // Email customer non-blocking
    if (order.user?.email) {
      sendEmail({
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
      }).catch((mailErr) => console.error("Refund email error:", mailErr.message));
    }

    return res.status(200).json({
      message: "Stripe refund processed successfully.",
      order,
      refund: stripeRefund,
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

    if (
      order.returnStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.returnStatus)
    ) {
      return res.status(400).json({
        message: "A return request is currently active for this order. Please conclude the return before requesting an exchange.",
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

    if (!product.stock || product.stock < exchangeQty) {
      return res.status(400).json({
        message: "Selected replacement variant is out of stock.",
      });
    }

    // Decrement stock for the replacement item
    await Product.findByIdAndUpdate(product._id, {
      $inc: { stock: -exchangeQty },
    });

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
      stockReserved: true,
      originalStockRestored: false,
      adminNote: "",
      processedAt: null,
    };

    await order.save();
    emitOrderUpdate("order_exchange_requested", order);

    const exchangeShortId = order._id.toString().slice(-8).toUpperCase();
    sendAdminNotification({
      title: "New Exchange Request",
      body: `Exchange request received for Order #${exchangeShortId}.`,
      type: "EXCHANGE",
      url: "/orders?tab=exchanges",
      orderId: order._id,
    });

    // Send confirmation email (non-blocking)
    if (order.user?.email) {
      sendEmail({
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
      }).catch((mailErr) => console.error("Exchange email error:", mailErr.message));
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

    const currentExchangeStatus = order.exchangeStatus || "NONE";

    // Strict transition lifecycle
    const VALID_EXCHANGE_TRANSITIONS = {
      NONE: ["REQUESTED"],
      REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["PICKUP_SCHEDULED", "CANCELLED"],
      PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
      PICKED_UP: ["RECEIVED", "CANCELLED"],
      RECEIVED: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    if (
      currentExchangeStatus !== exchangeStatus &&
      VALID_EXCHANGE_TRANSITIONS[currentExchangeStatus] &&
      !VALID_EXCHANGE_TRANSITIONS[currentExchangeStatus].includes(exchangeStatus)
    ) {
      return res.status(400).json({
        message: `Invalid exchange status transition from ${currentExchangeStatus} to ${exchangeStatus}.`,
      });
    }

    const oldExchangeStatus = order.exchangeStatus;
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
        stockReserved: false,
        originalStockRestored: false,
      };
    }

    order.exchangeRequest.status = exchangeStatus;
    if (adminNote !== undefined) {
      order.exchangeRequest.adminNote = adminNote;
    }
    order.exchangeRequest.processedAt = new Date();

    // Auto-populate logistics info on progress
    if (exchangeStatus === "PICKUP_SCHEDULED" && !order.exchangeRequest.pickupDate) {
      const pDate = new Date();
      pDate.setDate(pDate.getDate() + 1);
      order.exchangeRequest.pickupDate = pDate;
    }
    if (exchangeStatus === "SHIPPED") {
      if (!order.exchangeRequest.replacementTrackingNumber) {
        order.exchangeRequest.replacementTrackingNumber = `EX-TRK-${order._id.toString().slice(-8).toUpperCase()}`;
      }
      if (!order.exchangeRequest.replacementCarrier) {
        order.exchangeRequest.replacementCarrier = "Decathlon Express Logistics";
      }
      if (!order.exchangeRequest.replacementLocation) {
        order.exchangeRequest.replacementLocation = "Decathlon Regional Fulfillment Center";
      }
      if (!order.exchangeRequest.estimatedReplacementDeliveryDate) {
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + 3);
        order.exchangeRequest.estimatedReplacementDeliveryDate = estDate;
      }
    }
    if (exchangeStatus === "DELIVERED") {
      order.exchangeRequest.replacementDeliveredAt = new Date();
      order.exchangeRequest.replacementLocation = "Delivered to Customer";
    }

    // Release reserved replacement stock if exchange is REJECTED or CANCELLED
    if (["REJECTED", "CANCELLED"].includes(exchangeStatus) && order.exchangeRequest?.stockReserved) {
      if (order.exchangeRequest?.items && order.exchangeRequest.items.length > 0) {
        for (const eItem of order.exchangeRequest.items) {
          if (eItem.product) {
            await Product.findByIdAndUpdate(eItem.product, {
              $inc: { stock: eItem.quantity },
            });
          }
        }
      }
      order.exchangeRequest.stockReserved = false;
    }

    // Restock the original product once returned item is received by warehouse
    if (
      ["RECEIVED", "SHIPPED", "DELIVERED"].includes(exchangeStatus) &&
      !order.exchangeRequest?.originalStockRestored
    ) {
      if (order.exchangeRequest?.items && order.exchangeRequest.items.length > 0) {
        for (const eItem of order.exchangeRequest.items) {
          const originalItem = order.orderItems.find(
            (oi) =>
              oi.product?.toString() === eItem.product?.toString() ||
              oi.name === eItem.name,
          );
          const originalProdId = originalItem?.product || eItem.product;
          if (originalProdId) {
            await Product.findByIdAndUpdate(originalProdId, {
              $inc: { stock: eItem.quantity },
            });
          }
        }
      }
      order.exchangeRequest.originalStockRestored = true;
    }

    await order.save();
    emitOrderUpdate("order_exchange_status_updated", order);

    // Notify customer only if exchange status actually changed
    if (oldExchangeStatus !== exchangeStatus) {
      const shortId = order._id.toString().slice(-8).toUpperCase();
      const exchangeNotificationMap = {
        APPROVED: {
          title: "Exchange Approved",
          body: `Your exchange request for Order #${shortId} has been approved.`,
        },
        PICKUP_SCHEDULED: {
          title: "Exchange Pickup Scheduled",
          body: `Pickup has been scheduled for your exchange item in Order #${shortId}.`,
        },
        PICKED_UP: {
          title: "Exchange Picked Up",
          body: `Your exchange item for Order #${shortId} has been picked up.`,
        },
        RECEIVED: {
          title: "Exchange Item Received",
          body: `Your exchange item for Order #${shortId} has been received and inspected.`,
        },
        SHIPPED: {
          title: "Replacement Shipped",
          body: `Your replacement product for Order #${shortId} has been shipped!`,
        },
        DELIVERED: {
          title: "Exchange Completed",
          body: `Your replacement for Order #${shortId} has been successfully delivered.`,
        },
        REJECTED: {
          title: "Exchange Rejected",
          body: `Your exchange request for Order #${shortId} has been rejected.`,
        },
        CANCELLED: {
          title: "Exchange Cancelled",
          body: `Your exchange request for Order #${shortId} has been cancelled.`,
        },
      };

      const notifData = exchangeNotificationMap[exchangeStatus] || {
        title: `Exchange ${exchangeStatus.replace(/_/g, " ")}`,
        body: `Your exchange request for Order #${shortId} is now ${exchangeStatus.replace(/_/g, " ").toLowerCase()}.`,
      };

      sendNotification({
        userId: order.user?._id || order.user,
        title: notifData.title,
        body: notifData.body,
        type: "EXCHANGE",
        url: "/account/orders-returns?tab=order-returns",
        orderId: order._id,
      });
    }

    // Send email notification to customer (non-blocking)
    if (order.user?.email) {
      sendEmail({
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
      }).catch((mailErr) => console.error("Exchange status email error:", mailErr.message));
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

const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Customer: can only view their own order. Admin: can view any order.
    const isCustomer = req.user.role !== "admin";
    const userId = req.user.id || req.user._id;
    const orderUserId = order.user?._id ? order.user._id.toString() : order.user.toString();

    if (isCustomer && orderUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view tracking for this order",
      });
    }

    // If order has no tracking initialized, initialize defaults and persist
    let modified = false;
    if (!order.trackingNumber) {
      order.trackingNumber = await generateUniqueTrackingNumber();
      modified = true;
    }
    if (!order.carrier) {
      order.carrier = "Decathlon Demo Logistics";
      modified = true;
    }
    if (!order.estimatedDeliveryDate) {
      const estDate = new Date(order.createdAt || Date.now());
      estDate.setDate(estDate.getDate() + 5);
      order.estimatedDeliveryDate = estDate;
      modified = true;
    }
    if (!order.currentLocation || (!order.currentLocation.city && !order.currentLocation.latitude)) {
      order.currentLocation = {
        city: "Central Fulfillment Hub, Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
      };
      modified = true;
    }
    if (!order.trackingHistory || order.trackingHistory.length === 0) {
      order.trackingHistory = [
        {
          status: "ORDER_PLACED",
          location: "Order Processing",
          description: "Order placed successfully",
          timestamp: order.createdAt || new Date(),
        },
      ];
      modified = true;
    }

    const isCancelled = (order.orderStatus || "").toLowerCase() === "cancelled";

    if (isCancelled) {
      const hasCancelled = (order.trackingHistory || []).some(
        (h) => h.status === "CANCELLED"
      );
      if (!hasCancelled) {
        order.trackingHistory = order.trackingHistory || [];
        order.trackingHistory.push({
          status: "CANCELLED",
          location: "Not Applicable",
          description: order.cancellationReason || "Order cancelled",
          timestamp: order.cancelledAt || order.updatedAt || new Date(),
        });
        modified = true;
      }
    }

    const hasActiveReturn = Boolean(
      (order.returnStatus && !["NONE", "CANCELLED"].includes(order.returnStatus)) ||
      order.orderStatus === "returned" ||
      order.returnRequest?.requestedAt
    );

    const hasActiveExchange = Boolean(
      (order.exchangeStatus && !["NONE", "CANCELLED"].includes(order.exchangeStatus)) ||
      order.exchangeRequest?.requestedAt
    );

    const isDeliveredOrAfter =
      (order.orderStatus || "").toLowerCase() === "delivered" ||
      (order.orderStatus || "").toLowerCase() === "returned" ||
      hasActiveReturn ||
      hasActiveExchange ||
      Boolean(order.deliveredAt);

    // If order is delivered or has return/exchange, ensure delivery history includes DELIVERED
    if (isDeliveredOrAfter && !isCancelled) {
      const hasDeliveredEntry = (order.trackingHistory || []).some(
        (h) => h.status === "DELIVERED"
      );
      if (!hasDeliveredEntry) {
        order.trackingHistory = order.trackingHistory || [];
        order.trackingHistory.push({
          status: "DELIVERED",
          location: order.shippingAddress?.cityState || "Customer Address",
          description: "Order delivered successfully",
          timestamp: order.deliveredAt || order.updatedAt || new Date(),
        });
        modified = true;
      }
      if (!order.deliveredAt) {
        order.deliveredAt = order.updatedAt || new Date();
        modified = true;
      }
    }

    if (modified) {
      await order.save();
    }

    const currentDeliveryStatus = isCancelled
      ? "CANCELLED"
      : isDeliveredOrAfter
      ? "DELIVERED"
      : order.trackingHistory && order.trackingHistory.length > 0
      ? order.trackingHistory[order.trackingHistory.length - 1].status
      : "ORDER_PLACED";

    return res.status(200).json({
      success: true,
      tracking: {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier || "Decathlon Demo Logistics",
        status: currentDeliveryStatus,
        isCancelled,
        isDelivered: isDeliveredOrAfter,
        cancelledAt: order.cancelledAt || (isCancelled ? order.updatedAt : null),
        cancellationReason:
          order.cancellationReason || (isCancelled ? "Order cancelled" : ""),
        // Never show normal delivery ETA when original order is already delivered or cancelled
        estimatedDeliveryDate: isCancelled || isDeliveredOrAfter ? null : order.estimatedDeliveryDate,
        deliveredAt: isCancelled ? null : (order.deliveredAt || (isDeliveredOrAfter ? order.updatedAt : null)),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentReceivedAt: order.paymentReceivedAt || order.paidAt || null,
        orderStatus: order.orderStatus,
        returnStatus: order.returnStatus || order.returnRequest?.status || "NONE",
        returnRequest: order.returnRequest || null,
        exchangeStatus: order.exchangeStatus || order.exchangeRequest?.status || "NONE",
        exchangeRequest: order.exchangeRequest || null,
        hasActiveReturn,
        hasActiveExchange,
        currentLocation: isCancelled
          ? { city: "Not Applicable", latitude: null, longitude: null }
          : isDeliveredOrAfter
          ? { city: order.shippingAddress?.cityState || "Delivered", latitude: null, longitude: null }
          : order.currentLocation || {
              city: "",
              latitude: null,
              longitude: null,
            },
        trackingHistory: order.trackingHistory || [],
      },
    });
  } catch (error) {
    console.error("Get Order Tracking Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      city,
      latitude,
      longitude,
      location,
      description,
      estimatedDeliveryDate,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Cancelled/returned orders must not continue through normal delivery tracking
    if (["cancelled", "returned", "failed"].includes(order.orderStatus?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot update tracking for an order that is ${order.orderStatus}`,
      });
    }

    // 1. Status validation
    if (!status || typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status is required and must be a string",
      });
    }

    const normalizedStatus = status.trim().toUpperCase();
    const newStatusIndex = TRACKING_FLOW.indexOf(normalizedStatus);

    if (newStatusIndex === -1) {
      return res.status(400).json({
        success: false,
        message: `Invalid tracking status: "${status}". Allowed values: ${TRACKING_FLOW.join(", ")}`,
      });
    }

    // Ensure initial history if empty
    if (!order.trackingHistory || order.trackingHistory.length === 0) {
      order.trackingHistory = [
        {
          status: "ORDER_PLACED",
          location: "Order Processing",
          description: "Order placed successfully",
          timestamp: order.createdAt || new Date(),
        },
      ];
    }

    const currentStatus = order.trackingHistory[order.trackingHistory.length - 1].status;
    const currentStatusIndex = TRACKING_FLOW.indexOf(currentStatus);

    // Prevent invalid backward movement
    if (currentStatusIndex !== -1 && newStatusIndex < currentStatusIndex) {
      return res.status(400).json({
        success: false,
        message: `Invalid status progression: cannot transition backward from ${currentStatus} to ${normalizedStatus}`,
      });
    }

    // Strict validation for DELIVERED:
    // Only allow: OUT_FOR_DELIVERY → DELIVERED
    if (normalizedStatus === "DELIVERED") {
      // Prevent duplicate DELIVERED confirmation
      if (currentStatus === "DELIVERED") {
        return res.status(400).json({
          success: false,
          message: "Order is already marked as DELIVERED",
        });
      }
      if (currentStatus !== "OUT_FOR_DELIVERY") {
        return res.status(400).json({
          success: false,
          message: `Invalid status progression: cannot transition from ${currentStatus} to DELIVERED. Order must be OUT_FOR_DELIVERY before it can be marked as DELIVERED.`,
        });
      }
    }

    // 2. Location parsing & validation (supports both location: { city, latitude, longitude } and flat fields)
    const inputCity = location?.city !== undefined ? location.city : city;
    const inputLat = location?.latitude !== undefined ? location.latitude : latitude;
    const inputLng = location?.longitude !== undefined ? location.longitude : longitude;

    let newCity = inputCity !== undefined ? (typeof inputCity === "string" ? inputCity.trim() : null) : undefined;
    let newLat = inputLat !== undefined && inputLat !== null && inputLat !== "" ? Number(inputLat) : undefined;
    let newLng = inputLng !== undefined && inputLng !== null && inputLng !== "" ? Number(inputLng) : undefined;

    if (inputCity !== undefined || inputLat !== undefined || inputLng !== undefined) {
      if (inputCity !== undefined && inputCity !== null) {
        if (typeof inputCity !== "string" || !inputCity.trim()) {
          return res.status(400).json({
            success: false,
            message: "City must be a non-empty string when location is provided",
          });
        }
      }

      if (inputLat !== undefined && inputLat !== null && inputLat !== "") {
        if (isNaN(newLat) || newLat < -90 || newLat > 90) {
          return res.status(400).json({
            success: false,
            message: "Latitude must be a valid number between -90 and 90",
          });
        }
      }

      if (inputLng !== undefined && inputLng !== null && inputLng !== "") {
        if (isNaN(newLng) || newLng < -180 || newLng > 180) {
          return res.status(400).json({
            success: false,
            message: "Longitude must be a valid number between -180 and 180",
          });
        }
      }
    }

    // 3. Estimated delivery date validation
    if (estimatedDeliveryDate !== undefined && estimatedDeliveryDate !== null && estimatedDeliveryDate !== "") {
      const parsedDate = new Date(estimatedDeliveryDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid estimated delivery date format",
        });
      }
      order.estimatedDeliveryDate = parsedDate;
    }

    // 4. Update currentLocation
    if (!order.currentLocation) {
      order.currentLocation = { city: "", latitude: null, longitude: null };
    }
    if (newCity !== undefined && newCity !== null) {
      order.currentLocation.city = newCity;
    }
    if (newLat !== undefined) {
      order.currentLocation.latitude = newLat;
    }
    if (newLng !== undefined) {
      order.currentLocation.longitude = newLng;
    }

    // If city is still blank, populate from shipping address if available
    if (!order.currentLocation.city && order.shippingAddress?.cityState) {
      order.currentLocation.city = order.shippingAddress.cityState;
    }

    // 5. Build tracking history entry & prevent duplicate entries
    const lastEntry = order.trackingHistory[order.trackingHistory.length - 1];

    const entryLocation =
      (newCity !== undefined && newCity !== null)
        ? newCity
        : (order.currentLocation?.city || (lastEntry ? lastEntry.location : ""));

    const entryDescription =
      description && typeof description === "string" && description.trim()
        ? description.trim()
        : getDefaultDescription(normalizedStatus);

    const now = new Date();

    if (normalizedStatus === "DELIVERED") {
      order.orderStatus = "delivered";
      order.deliveredAt = now;

      // Prevent duplicate DELIVERED entry in trackingHistory
      const hasDeliveredEntry = order.trackingHistory.some(
        (h) => h.status === "DELIVERED"
      );
      if (!hasDeliveredEntry) {
        order.trackingHistory.push({
          status: "DELIVERED",
          location: entryLocation || "Delivered",
          description: entryDescription || "Order delivered successfully",
          timestamp: now,
        });
      }
      // Note: COD payment status is left untouched (PENDING if pending)
    } else {
      const isDuplicate =
        lastEntry &&
        lastEntry.status === normalizedStatus &&
        lastEntry.location === entryLocation &&
        lastEntry.description === entryDescription;

      if (!isDuplicate) {
        order.trackingHistory.push({
          status: normalizedStatus,
          location: entryLocation,
          description: entryDescription,
          timestamp: now,
        });
      }

      // Update order status where appropriate
      if (normalizedStatus === "CONFIRMED") {
        if (order.orderStatus === "pending") {
          order.orderStatus = "confirmed";
        }
      } else if (normalizedStatus === "PACKED") {
        if (["pending", "confirmed"].includes(order.orderStatus)) {
          order.orderStatus = "processing";
        }
      } else if (["SHIPPED", "REACHED_HUB", "OUT_FOR_DELIVERY"].includes(normalizedStatus)) {
        if (order.orderStatus !== "delivered") {
          order.orderStatus = "shipped";
        }
      }
    }

    // Ensure trackingNumber & carrier exist
    if (!order.trackingNumber) {
      order.trackingNumber = await generateUniqueTrackingNumber();
    }
    if (!order.carrier) {
      order.carrier = "Decathlon Demo Logistics";
    }

    await order.save();

    const finalStatus =
      order.trackingHistory && order.trackingHistory.length > 0
        ? order.trackingHistory[order.trackingHistory.length - 1].status
        : normalizedStatus;

    const trackingPayload = {
      orderId: order._id,
      status: finalStatus,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      currentLocation: order.currentLocation,
      timestamp: finalStatus === "DELIVERED" ? order.deliveredAt : now,
    };

    // Emit Socket.IO customer event and broadcast
    emitTrackingUpdateToUser(order.user, trackingPayload);
    emitOrderUpdate("order_tracking_updated", trackingPayload);
    emitOrderUpdate("order_updated", order);

    // Customer Notification & Web Push upon DELIVERED (deduplicated)
    if (normalizedStatus === "DELIVERED") {
      const existingDeliveredNotif = await Notification.findOne({
        recipient: order.user,
        order: order._id,
        title: "Order Delivered",
      });

      if (!existingDeliveredNotif) {
        await sendNotification({
          userId: order.user,
          title: "Order Delivered",
          body: "Your order has been delivered successfully.",
          type: "ORDER",
          url: "/account/orders-returns?tab=order-returns",
          orderId: order._id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: normalizedStatus === "DELIVERED" ? "Order marked as delivered successfully" : "Tracking updated successfully",
      tracking: {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        status: finalStatus,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        deliveredAt: order.deliveredAt || null,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentReceivedAt: order.paymentReceivedAt || order.paidAt || null,
        orderStatus: order.orderStatus,
        currentLocation: order.currentLocation,
        trackingHistory: order.trackingHistory,
      },
      order,
    });
  } catch (error) {
    console.error("Update Order Tracking Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
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
  getOrderTracking,
  updateOrderTracking,
};
