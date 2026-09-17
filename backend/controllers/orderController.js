import Order from "../models/Order.js";
import Cart from "../models/cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import { emitOrderUpdate } from "../socket/socketManager.js";

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
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "pending" && order.orderStatus !== "confirmed") {
      return res.status(400).json({
        message: "This order cannot be cancelled",
      });
    }

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

    return res.status(200).json({
      message: "Order cancelled successfully",
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

    return res.status(200).json({
      count: orders.length,
      orders,
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
      "refunded",
      "return_requested",
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
      if (order.returnStatus && order.returnStatus !== "NONE") {
        order.returnStatus = "REFUNDED";
        if (order.returnRequest) {
          order.returnRequest.status = "REFUNDED";
          order.returnRequest.processedAt = new Date();
        }
      }
      if (order.orderStatus === "return_requested") {
        order.orderStatus = "refunded";
      }
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

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: "Please select a valid return reason",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Please select at least one product to return",
      });
    }

    // Securely find order belonging to authenticated user
    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found or does not belong to your account",
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

    // Eligibility check 3: Cannot already have a return request
    if (
      order.returnStatus &&
      order.returnStatus !== "NONE" &&
      order.orderStatus === "return_requested"
    ) {
      return res.status(400).json({
        message: "A return request has already been submitted for this order",
      });
    }

    // Eligibility check 4: Return window check (strictly 7 days from order creation/delivery)
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
          oi.product?._id?.toString() === targetProductId
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
    order.orderStatus = "return_requested";
    order.returnStatus = "REQUESTED";
    order.returnRequest = {
      requestedAt: new Date(),
      reason: reason.trim(),
      details: (details || "").trim(),
      items: returnItemsList,
      status: "REQUESTED",
      refundAmount: calculatedRefundAmount,
      adminNote: "",
      processedAt: null,
    };

    await order.save();

    emitOrderUpdate("order_return_requested", order);

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
      "REFUNDED",
    ];

    if (!returnStatus || !allowedReturnStatuses.includes(returnStatus)) {
      return res.status(400).json({
        message: "Invalid return status",
      });
    }

    const order = await Order.findById(id).populate(
      "user",
      "name email phone"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
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
      };
    }

    order.returnRequest.status = returnStatus;
    if (adminNote !== undefined) {
      order.returnRequest.adminNote = adminNote;
    }
    order.returnRequest.processedAt = new Date();

    // Synchronize order lifecycle with return status
    if (returnStatus === "REFUNDED") {
      order.orderStatus = "refunded";
      order.paymentStatus = "refunded";
    } else if (returnStatus === "APPROVED") {
      order.orderStatus = "returned";
    } else if (returnStatus === "REJECTED") {
      order.orderStatus = "delivered";
    } else if (returnStatus === "REQUESTED") {
      order.orderStatus = "return_requested";
    }

    await order.save();

    emitOrderUpdate("order_return_status_updated", order);

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
};
