import Notification from "../models/Notification.js";
import PushSubscription from "../models/PushSubscription.js";

/**
 * Get VAPID public key for Web Push client subscription.
 */
export const getVapidPublicKey = async (req, res) => {
  try {
    return res.status(200).json({
      publicKey: process.env.VAPID_PUBLIC_KEY || "",
    });
  } catch (error) {
    console.error("Get VAPID Key Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Register / update a web push subscription for the authenticated user.
 * Authenticated user ID is strictly taken from req.user.id.
 */
export const subscribePush = async (req, res) => {
  try {
    const { subscription, userAgent = "" } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({
        message: "Invalid push subscription object. Endpoint and keys are required.",
      });
    }

    const { endpoint, keys } = subscription;

    // Support multiple devices/browsers without overwriting different subscriptions
    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user.id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: userAgent || req.headers["user-agent"] || "",
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Push subscription registered successfully",
      subscriptionId: sub._id,
    });
  } catch (error) {
    console.error("Subscribe Push Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Unsubscribe a web push subscription.
 */
export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        message: "Subscription endpoint is required to unsubscribe",
      });
    }

    await PushSubscription.findOneAndDelete({
      endpoint,
      user: req.user.id,
    });

    return res.status(200).json({
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Unsubscribe Push Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get notifications for the authenticated user (or admin).
 * Supports type, read status, keyword search, and pagination.
 */
export const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const skip = (page - 1) * limit;

    const { type, read, search } = req.query;

    const recipientFilter =
      req.user.role === "admin"
        ? { $or: [{ recipient: req.user.id }, { recipient: null }] }
        : { recipient: req.user.id };

    const andConditions = [recipientFilter];

    if (type && type !== "ALL") {
      if (type === "RETURN_EXCHANGE") {
        andConditions.push({ type: { $in: ["RETURN", "EXCHANGE"] } });
      } else {
        andConditions.push({ type });
      }
    }

    if (read !== undefined && read !== "") {
      andConditions.push({ read: read === "true" || read === true });
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [{ title: reg }, { message: reg }],
      });
    }

    const filter = andConditions.length > 1 ? { $and: andConditions } : recipientFilter;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("order", "orderStatus totalAmount createdAt"),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        ...recipientFilter,
        read: false,
      }),
    ]);

    return res.status(200).json({
      notifications,
      totalCount,
      unreadCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Mark a single notification as read.
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientFilter =
      req.user.role === "admin"
        ? { $or: [{ recipient: req.user.id }, { recipient: null }] }
        : { recipient: req.user.id };

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        ...recipientFilter,
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    const unreadCount = await Notification.countDocuments({
      ...recipientFilter,
      read: false,
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Mark all notifications as read for the authenticated user.
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const recipientFilter =
      req.user.role === "admin"
        ? { $or: [{ recipient: req.user.id }, { recipient: null }] }
        : { recipient: req.user.id };

    await Notification.updateMany(
      {
        ...recipientFilter,
        read: false,
      },
      { read: true }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a single notification.
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientFilter =
      req.user.role === "admin"
        ? { $or: [{ recipient: req.user.id }, { recipient: null }] }
        : { recipient: req.user.id };

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      ...recipientFilter,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Clear all read notifications for user.
 */
export const clearReadNotifications = async (req, res) => {
  try {
    const recipientFilter =
      req.user.role === "admin"
        ? { $or: [{ recipient: req.user.id }, { recipient: null }] }
        : { recipient: req.user.id };

    await Notification.deleteMany({
      ...recipientFilter,
      read: true,
    });

    return res.status(200).json({ message: "All read notifications cleared" });
  } catch (error) {
    console.error("Clear Read Notifications Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Trigger a test notification popup for Admin (UI verification only — NOT saved to database/inbox).
 */
export const testAdminNotification = async (req, res) => {
  try {
    const { type = "ORDER" } = req.body;
    const { emitNotificationToAdmins } = await import(
      "../socket/socketManager.js"
    );
    const { sendPushToAdmins } = await import(
      "../services/pushNotificationService.js"
    );

    const testTitles = {
      ORDER: "New Order Received",
      RETURN: "New Return Request",
      EXCHANGE: "New Exchange Request",
      LOW_STOCK: "Low Stock Alert",
      REFUND: "Refund Completed",
    };

    const testBodies = {
      ORDER: `Order #DEC${Math.floor(1000 + Math.random() * 9000)} received for ₹2,499.`,
      RETURN: `Return request received for Order #DEC${Math.floor(1000 + Math.random() * 9000)}.`,
      EXCHANGE: `Exchange request received for Order #DEC${Math.floor(1000 + Math.random() * 9000)}.`,
      LOW_STOCK: "Quechua Mountain Hiking Shoes has only 2 items left.",
      REFUND: `Refund completed for Order #DEC${Math.floor(1000 + Math.random() * 9000)}.`,
    };

    const urlMap = {
      ORDER: "/orders",
      RETURN: "/orders?tab=returns",
      EXCHANGE: "/orders?tab=exchanges",
      LOW_STOCK: "/products",
      REFUND: "/orders?tab=returns",
    };

    const testNotif = {
      _id: `test_${Date.now()}`,
      title: testTitles[type] || "Test Notification",
      message: testBodies[type] || "This is a test notification popup.",
      type: type || "ORDER",
      url: urlMap[type] || "/orders",
      isTest: true,
      read: false,
      createdAt: new Date(),
    };

    // Emit live Socket.IO popup to admin screens (NO DATABASE SAVE)
    emitNotificationToAdmins(testNotif);

    // Send Web Push notification if enabled (NO DATABASE SAVE)
    sendPushToAdmins({
      title: testNotif.title,
      body: testNotif.message,
      type: testNotif.type,
      url: testNotif.url,
      notificationId: testNotif._id,
    }).catch(() => {});

    return res.status(200).json({
      message: "Test popup emitted successfully (not saved to database)",
      notification: testNotif,
    });
  } catch (error) {
    console.error("Test Admin Notification Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

