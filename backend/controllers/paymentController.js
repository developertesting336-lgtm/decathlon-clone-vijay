import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import { emitOrderUpdate } from "../socket/socketManager.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/*
  CREATE PAYMENT INTENT
*/
const createPaymentIntent = async (req, res) => {
  try {
    const { orderId, paymentMethod = "CARD" } = req.body;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
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

    const totalAmount = Number(order.totalAmount);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: "Invalid order amount",
      });
    }

    const amount = Math.round(totalAmount * 100);

    /*
      Reuse existing PaymentIntent if valid and open
    */
    if (order.stripePaymentIntentId) {
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

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "inr",

        automatic_payment_methods: {
          enabled: true,
        },

        metadata: {
          orderId: order._id.toString(),

          userId: req.user.id.toString(),

          paymentMethod: paymentMethod === "UPI" ? "UPI" : "CARD",
        },
      },
      {
        idempotencyKey: `order_${order._id.toString()}`,
      },
    );

    order.stripePaymentIntentId = paymentIntent.id;

    /*
      Store informational payment method.
      Stripe PaymentElement still decides
      the actual available method.
    */
    order.paymentMethod = paymentMethod === "UPI" ? "UPI" : "CARD";

    await order.save();

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

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        message: "Payment Intent ID and Order ID are required",
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

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

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
