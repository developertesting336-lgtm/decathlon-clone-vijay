import Stripe from "stripe";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Cart from "../models/cart.js";
import Coupon from "../models/Coupon.js";
import { emitOrderUpdate } from "../socket/socketManager.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/*
  CREATE PAYMENT INTENT
*/
const createPaymentIntent = async (req, res) => {
  try {
    const {
      orderId,
      paymentMethod = "CARD",
      deliveryOption = "standard",
      couponCode,
    } = req.body;

    let totalAmount = 0;
    let order = null;

    if (orderId) {
      order = await Order.findOne({
        _id: orderId,
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
          message: "Cancelled order cannot be paid",
        });
      }

      totalAmount = Number(order.totalAmount);
    } else {
      const cart = await Cart.findOne({
        user: req.user.id,
      }).populate("items.product");

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          message: "Cart is empty",
        });
      }

      let subtotal = 0;
      for (const item of cart.items) {
        const product = item.product;
        if (product && product.isActive) {
          const finalPrice =
            product.discountPrice > 0 ? product.discountPrice : product.price;
          subtotal += finalPrice * item.quantity;
        }
      }

      let deliveryCharge = 0;
      if (deliveryOption === "standard") {
        deliveryCharge = subtotal >= 999 ? 0 : 49;
      }

      let couponDiscount = 0;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: String(couponCode).trim().toUpperCase(),
          isActive: true,
        });
        if (coupon && subtotal >= (coupon.minOrderAmount || 0)) {
          if (coupon.discountType === "percentage") {
            couponDiscount = Math.round(
              (subtotal * coupon.discountValue) / 100,
            );
            if (coupon.maxDiscountAmount > 0) {
              couponDiscount = Math.min(
                couponDiscount,
                coupon.maxDiscountAmount,
              );
            }
          } else {
            couponDiscount = Math.min(coupon.discountValue, subtotal);
          }
        }
      }

      totalAmount = Math.max(0, subtotal - couponDiscount + deliveryCharge);
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: "Invalid order amount",
      });
    }

    const amount = Math.round(totalAmount * 100);

    /*
      Reuse existing PaymentIntent if valid and open on existing order
    */
    if (order && order.stripePaymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          order.stripePaymentIntentId,
        );

        if (
          existingIntent.status !== "succeeded" &&
          existingIntent.status !== "canceled" &&
          existingIntent.amount === amount &&
          existingIntent.currency === "inr"
        ) {
          order.paymentMethod = paymentMethod === "UPI" ? "UPI" : "CARD";
          await order.save();

          return res.status(200).json({
            message: "Payment intent already exists",
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
          });
        }
      } catch (error) {
        console.error("Existing PaymentIntent Error:", error.message);
        order.stripePaymentIntentId = "";
        await order.save();
      }
    }

    const paymentIntentParams = {
      amount,
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order ? order._id.toString() : "",
        userId: req.user.id.toString(),
        paymentMethod: paymentMethod === "UPI" ? "UPI" : "CARD",
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    if (order) {
      order.stripePaymentIntentId = paymentIntent.id;
      order.paymentMethod = paymentMethod === "UPI" ? "UPI" : "CARD";
      await order.save();
    }

    return res.status(200).json({
      message: "Payment intent created",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Create Payment Intent Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to create payment intent",
    });
  }
};

/*
  VERIFY PAYMENT
*/
const verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: "Payment Intent ID is required",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment has not succeeded",
        paymentStatus: "failed",
      });
    }

    if (
      !orderId ||
      orderId === "null" ||
      orderId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      return res.status(200).json({
        message: "Payment verified successfully",
        paymentStatus: "paid",
        paymentIntentId: paymentIntent.id,
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    /*
      Check PaymentIntent belongs
      to this order
    */
    if (paymentIntent.metadata?.orderId !== order._id.toString()) {
      return res.status(400).json({
        message: "Payment does not belong to this order",
      });
    }

    /*
      Check PaymentIntent belongs
      to this user
    */
    if (paymentIntent.metadata?.userId !== req.user.id.toString()) {
      return res.status(400).json({
        message: "Payment does not belong to this user",
      });
    }

    /*
      Check amount
    */
    const expectedAmount = Math.round(Number(order.totalAmount) * 100);

    if (paymentIntent.amount !== expectedAmount) {
      return res.status(400).json({
        message: "Payment amount does not match order amount",
      });
    }

    /*
      Check currency
    */
    if (paymentIntent.currency !== "inr") {
      return res.status(400).json({
        message: "Payment currency does not match",
      });
    }

    /*
      Check stored PaymentIntent
    */
    if (
      order.stripePaymentIntentId &&
      order.stripePaymentIntentId !== paymentIntent.id
    ) {
      return res.status(400).json({
        message: "Payment Intent does not match order",
      });
    }

    /*
      SUCCESS
    */
    if (paymentIntent.status === "succeeded") {
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.stripePaymentIntentId = paymentIntent.id;

      if (paymentIntent.metadata?.paymentMethod) {
        order.paymentMethod =
          paymentIntent.metadata.paymentMethod.toUpperCase() === "UPI"
            ? "UPI"
            : "CARD";
      }

      await order.save();

      emitOrderUpdate("order_confirmed", order);

      return res.status(200).json({
        message: "Payment verified successfully",
        paymentStatus: "paid",
        order,
      });
    }

    /*
      PROCESSING
    */
    if (
      paymentIntent.status === "processing" ||
      paymentIntent.status === "requires_action"
    ) {
      return res.status(200).json({
        message: "Payment is still processing",

        paymentStatus: paymentIntent.status,
      });
    }

    /*
      PAYMENT METHOD REQUIRED
    */
    if (paymentIntent.status === "requires_payment_method") {
      order.paymentStatus = "pending";

      await order.save();

      return res.status(400).json({
        message: "Payment method is required",

        paymentStatus: paymentIntent.status,
      });
    }

    /*
      FAILED
    */
    order.paymentStatus = "failed";

    order.orderStatus = "failed";

    await order.save();

    return res.status(400).json({
      message: "Payment failed",

      paymentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);

    return res.status(500).json({
      message: error.message || "Failed to verify payment",
    });
  }
};

export { createPaymentIntent, verifyPayment };
