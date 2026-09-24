import "dotenv/config";
import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";
import User from "../models/User.js";

// Initialize VAPID details if keys are present
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:support@decathlonclone.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log("✓ Web Push VAPID initialized successfully");
  } catch (err) {
    console.error("Failed to initialize Web Push VAPID:", err.message);
  }
} else {
  console.warn("⚠️ VAPID keys not fully configured in environment.");
}

/**
 * Send push notification to a single PushSubscription record.
 * Automatically cleans up expired/invalid subscriptions on 404 or 410.
 */
export const sendPushToSubscription = async (subscriptionDoc, payload) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return false;
  }

  const pushSubscription = {
    endpoint: subscriptionDoc.endpoint,
    keys: {
      p256dh: subscriptionDoc.keys?.p256dh,
      auth: subscriptionDoc.keys?.auth,
    },
  };

  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  try {
    await webpush.sendNotification(pushSubscription, payloadString);
    return true;
  } catch (error) {
    const statusCode = error.statusCode;

    // 404 Not Found or 410 Gone means the subscription has expired or unsubscribed
    if (statusCode === 404 || statusCode === 410) {
      console.log(
        `🧹 Removing expired push subscription (${statusCode}): ${subscriptionDoc.endpoint}`
      );
      try {
        await PushSubscription.deleteOne({ _id: subscriptionDoc._id });
      } catch (delErr) {
        console.error("Error removing expired subscription:", delErr.message);
      }
    } else {
      console.error(
        `Push notification error (status ${statusCode || "unknown"}):`,
        error.message
      );
    }
    return false;
  }
};

/**
 * Send web push notification to all subscriptions of a specific user.
 */
export const sendPushToUser = async (userId, payload) => {
  try {
    if (!userId) return;
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions || subscriptions.length === 0) return;

    await Promise.allSettled(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );
  } catch (error) {
    console.error("Send Push To User Error:", error.message);
  }
};

/**
 * Send web push notification to all admin users' subscriptions.
 */
export const sendPushToAdmins = async (payload) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    const adminIds = admins.map((a) => a._id);
    if (adminIds.length === 0) return;

    const subscriptions = await PushSubscription.find({
      user: { $in: adminIds },
    });
    if (!subscriptions || subscriptions.length === 0) return;

    await Promise.allSettled(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );
  } catch (error) {
    console.error("Send Push To Admins Error:", error.message);
  }
};
