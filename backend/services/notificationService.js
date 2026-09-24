import Notification from "../models/Notification.js";
import User from "../models/User.js";
import {
  emitNotificationToUser,
  emitNotificationToAdmins,
} from "../socket/socketManager.js";
import {
  sendPushToUser,
  sendPushToAdmins,
} from "./pushNotificationService.js";

/**
 * Send notification to a specific customer/user.
 * 1. Saves notification in MongoDB
 * 2. Emits Socket.IO notification to user's personal room
 * 3. Sends Web Push to user's active subscriptions
 */
export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  url = "",
  orderId = null,
}) => {
  try {
    if (!userId || !title || !body || !type) {
      console.warn("sendNotification missing required fields", {
        userId,
        title,
        body,
        type,
      });
      return null;
    }

    // 1. Save in MongoDB
    const notification = await Notification.create({
      recipient: userId,
      title: title.trim(),
      message: body.trim(),
      type,
      url: url || "",
      order: orderId || null,
      read: false,
    });

    const notifObj = notification.toObject();

    // 2. Emit Socket.IO notification
    emitNotificationToUser(userId, notifObj);

    // 3. Send Web Push
    const pushPayload = {
      title: notification.title,
      body: notification.message,
      type: notification.type,
      url: notification.url,
      orderId: notification.order ? notification.order.toString() : null,
      notificationId: notification._id.toString(),
    };

    sendPushToUser(userId, pushPayload).catch((pushErr) => {
      console.error("Web Push failed for user:", pushErr.message);
    });

    return notification;
  } catch (error) {
    console.error("sendNotification Error:", error);
    return null;
  }
};

/**
 * Send notification to all admin users.
 * 1. Finds all admins and saves a notification in MongoDB for each admin
 * 2. Emits Socket.IO notification to the admin room
 * 3. Sends Web Push to all admin users' active subscriptions
 */
export const sendAdminNotification = async ({
  title,
  body,
  type,
  url = "",
  orderId = null,
}) => {
  try {
    if (!title || !body || !type) {
      console.warn("sendAdminNotification missing required fields", {
        title,
        body,
        type,
      });
      return [];
    }

    const admins = await User.find({ role: "admin" }).select("_id name");
    
    let notifications = [];
    if (admins && admins.length > 0) {
      notifications = await Promise.all(
        admins.map((admin) =>
          Notification.create({
            recipient: admin._id,
            title: title.trim(),
            message: body.trim(),
            type,
            url: url || "",
            order: orderId || null,
            read: false,
          })
        )
      );
    } else {
      console.warn("sendAdminNotification: No admin users found in database, creating broadcast notification");
      const fallbackNotif = await Notification.create({
        recipient: null,
        title: title.trim(),
        message: body.trim(),
        type,
        url: url || "",
        order: orderId || null,
        read: false,
      });
      notifications = [fallbackNotif];
    }

    const firstNotif = notifications[0]?.toObject() || {
      title,
      message: body,
      type,
      url,
      order: orderId,
      createdAt: new Date(),
    };

    // 2. Emit Socket.IO notification to admin_room
    emitNotificationToAdmins(firstNotif);

    // 3. Send Web Push to all admin devices
    const pushPayload = {
      title: firstNotif.title,
      body: firstNotif.message,
      type: firstNotif.type,
      url: firstNotif.url,
      orderId: firstNotif.order ? firstNotif.order.toString() : null,
      notificationId: firstNotif._id ? firstNotif._id.toString() : null,
    };

    sendPushToAdmins(pushPayload).catch((pushErr) => {
      console.error("Web Push failed for admins:", pushErr.message);
    });

    return notifications;
  } catch (error) {
    console.error("sendAdminNotification Error:", error);
    return [];
  }
};

/**
 * Check product stock against LOW_STOCK_THRESHOLD.
 * Triggers alert once when stock drops <= threshold.
 * Prevents spam until product is restocked > threshold.
 */
export const checkAndNotifyLowStock = async (productIdOrDoc) => {
  try {
    const threshold = Number(process.env.LOW_STOCK_THRESHOLD) || 5;
    const Product = (await import("../models/Product.js")).default;

    let product = productIdOrDoc;
    if (!product || typeof product === "string" || !product.name) {
      const id = product?._id || product;
      product = await Product.findById(id);
    }

    if (!product) return;

    const currentStock = Number(product.stock || 0);

    if (currentStock <= threshold) {
      if (!product.lowStockNotified) {
        await sendAdminNotification({
          title: "Low Stock Alert",
          body: `${product.name} has only ${currentStock} item${currentStock === 1 ? "" : "s"} left.`,
          type: "LOW_STOCK",
          url: "/products",
        });

        await Product.findByIdAndUpdate(product._id, {
          lowStockNotified: true,
        });
      }
    } else {
      if (product.lowStockNotified) {
        await Product.findByIdAndUpdate(product._id, {
          lowStockNotified: false,
        });
      }
    }
  } catch (error) {
    console.error("checkAndNotifyLowStock Error:", error);
  }
};

