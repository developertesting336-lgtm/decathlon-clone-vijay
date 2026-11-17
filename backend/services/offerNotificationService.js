import Offer from "../models/Offer.js";
import Product from "../models/Product.js";
import Wishlist from "../models/Wishlist.js";
import User from "../models/User.js";
import { sendNotification, sendAdminNotification } from "./notificationService.js";
import { sendPushToAllSubscribers, sendPushToUser } from "./pushNotificationService.js";
import { sendEmail } from "../utils/emailService.js";
import { checkAndNotifyPriceDrop } from "./priceDropService.js";
import { getIO, emitHomepageUpdate } from "../socket/socketManager.js";

/**
 * Format target scope into a user-friendly readable summary
 */
const getScopeSummary = (offer) => {
  if (offer.targetType === "sitewide") return "All Sports Gear";
  if (offer.targetType === "category") {
    const count = offer.applicableCategories?.length || 0;
    if (count > 0 && offer.applicableCategories[0]?.name) {
      const names = offer.applicableCategories.slice(0, 3).map((c) => c.name).join(", ");
      return count > 3 ? `${names} + ${count - 3} more` : names;
    }
    return `${count} Categories`;
  }
  const prodCount = offer.applicableProducts?.length || 0;
  if (prodCount > 0 && offer.applicableProducts[0]?.name) {
    const names = offer.applicableProducts.slice(0, 2).map((p) => p.name).join(", ");
    return prodCount > 2 ? `${names} + ${prodCount - 2} more` : names;
  }
  return `${prodCount} Products`;
};

/**
 * Format discount into readable text (e.g. "20% OFF" or "₹500 FLAT OFF")
 */
const getDiscountText = (offer) => {
  if (offer.discountType === "percentage") {
    return `${offer.discountValue}% OFF${offer.maxDiscountAmount ? ` (Up to ₹${offer.maxDiscountAmount})` : ""}`;
  }
  return `₹${Number(offer.discountValue || 0).toLocaleString("en-IN")} FLAT OFF`;
};

/**
 * Format date/time cleanly for notifications (e.g. "17 Nov, 12:55 PM")
 */
const formatDateTime = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return new Date(date).toLocaleString();
  }
};

/**
 * 1. NOTIFY WHEN AN OFFER IS SCHEDULED (Upcoming Sale Announcement)
 */
export const notifyOfferScheduled = async (offerOrId, force = false) => {
  try {
    let offer = offerOrId;
    if (!offer || typeof offer === "string" || !offer.title) {
      offer = await Offer.findById(offer?._id || offer)
        .populate("applicableProducts", "name price discountPrice images")
        .populate("applicableCategories", "name image");
    }

    if (!offer || !offer.isActive) return { success: false, notifiedCount: 0 };

    if (!force && offer.scheduledNotifiedAt) {
      console.log(`notifyOfferScheduled: Offer "${offer.title}" was already announced. Skipping duplicate.`);
      return { success: true, notifiedCount: 0 };
    }

    const discountText = getDiscountText(offer);
    const scopeSummary = getScopeSummary(offer);
    const startTimeFormatted = formatDateTime(offer.startDate);
    const badge = offer.badgeLabel || "Upcoming Sale";

    const title = `📅 Upcoming Sale: ${offer.title}`;
    const body = `${badge}: Get ${discountText} on ${scopeSummary}! Starts on ${startTimeFormatted}. Save to your wishlist now!`;
    const offerUrl = offer.targetType === "product" && offer.applicableProducts?.[0]?._id
      ? `/product/${offer.applicableProducts[0]._id}`
      : offer.targetType === "category" && offer.applicableCategories?.[0]?._id
      ? `/category/${offer.applicableCategories[0]._id}`
      : "/";

    let customerCount = 0;

    // A. Create In-App Notifications & Socket.IO for all registered users
    const allUsers = await User.find({ isActive: { $ne: false } }).select("_id name email role communicationPreferences");

    for (const u of allUsers) {
      try {
        await sendNotification({
          userId: u._id,
          title,
          body,
          type: "OFFER",
          url: offerUrl,
        });
        customerCount++;
      } catch (err) {}
    }

    // B. Send Web Push to ALL registered devices (Desktop & Mobile OS Popups)
    const pushPayload = {
      title,
      body,
      icon: "/logo192.png",
      badge: "/favicon-32x32.png",
      data: { url: offerUrl, offerId: offer._id.toString(), type: "OFFER" },
      actions: [
        { action: "explore", title: "View Sale Details" },
        { action: "close", title: "Dismiss" },
      ],
    };
    sendPushToAllSubscribers(pushPayload).catch((e) => console.error("Broadcast push error:", e.message));

    // C. Notify Admins
    await sendAdminNotification({
      title: `📅 Sale Scheduled: ${offer.title}`,
      body: `${badge}: ${discountText} on ${scopeSummary}. Starts: ${startTimeFormatted}.`,
      type: "OFFER",
      url: "/offers",
    });

    // D. Realtime Broadcast to All Connected Storefront Browsers (live toast)
    try {
      const io = getIO();
      if (io) {
        const livePayload = {
          offerId: offer._id,
          title,
          message: body,
          badgeLabel: badge,
          bannerText: offer.bannerText,
          status: "scheduled",
          url: offerUrl,
          createdAt: new Date(),
        };
        io.emit("offer_alert", livePayload);
        emitHomepageUpdate("offer_scheduled", livePayload);
      }
    } catch (e) {}

    // Update flag
    offer.scheduledNotifiedAt = new Date();
    await Offer.findByIdAndUpdate(offer._id, { scheduledNotifiedAt: new Date() });

    console.log(`✓ Upcoming Offer "${offer.title}" broadcast dispatched to ${customerCount} users + web push subscribers.`);
    return { success: true, notifiedCount: customerCount };
  } catch (error) {
    console.error("notifyOfferScheduled Error:", error);
    return { success: false, notifiedCount: 0 };
  }
};

/**
 * 2. NOTIFY WHEN AN OFFER HAS STARTED / GONE LIVE (Flash Sale Alert)
 */
export const notifyOfferStarted = async (offerOrId, force = false) => {
  try {
    let offer = offerOrId;
    if (!offer || typeof offer === "string" || !offer.title) {
      offer = await Offer.findById(offer?._id || offer)
        .populate("applicableProducts", "name price discountPrice images")
        .populate("applicableCategories", "name image");
    }

    if (!offer || !offer.isActive || offer.status === "disabled" || offer.status === "expired") {
      return { success: false, notifiedCount: 0 };
    }

    if (!force && offer.startedNotifiedAt) {
      console.log(`notifyOfferStarted: Offer "${offer.title}" was already announced as live. Skipping duplicate.`);
      return { success: true, notifiedCount: 0 };
    }

    const discountText = getDiscountText(offer);
    const scopeSummary = getScopeSummary(offer);
    const badge = offer.badgeLabel || "Flash Deal";

    const title = `🔥 Sale is Now LIVE: ${offer.title}`;
    const body = offer.bannerText
      ? `${offer.bannerText} — ${discountText} is now active on ${scopeSummary}! Limited time only.`
      : `${badge}: ${discountText} is now LIVE on ${scopeSummary}! Grab deals before stocks run out.`;

    const offerUrl = offer.targetType === "product" && offer.applicableProducts?.[0]?._id
      ? `/product/${offer.applicableProducts[0]._id}`
      : offer.targetType === "category" && offer.applicableCategories?.[0]?._id
      ? `/category/${offer.applicableCategories[0]._id}`
      : "/";

    let customerCount = 0;
    const notifiedUserIds = new Set();

    // A. Product Price Drops for explicit subscribers and wishlist holders
    if (offer.targetType === "product" && Array.isArray(offer.applicableProducts)) {
      for (const prod of offer.applicableProducts) {
        try {
          const originalPrice = Number(prod.price || 0);
          const currentSelling = Number(prod.discountPrice > 0 ? prod.discountPrice : originalPrice);
          if (currentSelling <= 0) continue;

          let discountAmount = 0;
          if (offer.discountType === "percentage") {
            discountAmount = (currentSelling * Number(offer.discountValue)) / 100;
            if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
              discountAmount = offer.maxDiscountAmount;
            }
          } else if (offer.discountType === "flat") {
            discountAmount = Number(offer.discountValue);
          }

          const offerPrice = Math.max(1, currentSelling - Math.round(discountAmount));
          if (offerPrice < currentSelling) {
            const res = await checkAndNotifyPriceDrop(prod, currentSelling, offerPrice, {
              offerTitle: offer.title,
              type: "OFFER",
            });
            customerCount += res?.notifiedCount || 0;
          }
        } catch (e) {}
      }
    }

    // B. Category Wishlist matches
    if (offer.targetType === "category" && Array.isArray(offer.applicableCategories)) {
      const catIds = offer.applicableCategories.map((c) => c._id || c);
      const catProducts = await Product.find({
        $or: [{ category: { $in: catIds } }, { categories: { $in: catIds } }],
        isActive: true,
      }).select("_id");
      const prodIds = catProducts.map((p) => p._id);

      const wishlists = await Wishlist.find({
        $or: [{ "items.product": { $in: prodIds } }, { products: { $in: prodIds } }],
      }).populate("user", "name email");

      for (const wl of wishlists) {
        if (!wl.user?._id) continue;
        const uidStr = wl.user._id.toString();
        if (notifiedUserIds.has(uidStr)) continue;

        try {
          await sendNotification({
            userId: wl.user._id,
            title: `🏷️ Wishlist Offer: ${offer.title}`,
            body: `Items in your wishlist have a new offer: ${discountText}! Shop now.`,
            type: "OFFER",
            url: offerUrl,
          });
          notifiedUserIds.add(uidStr);
          customerCount++;
        } catch (e) {}
      }
    }

    // C. Dispatch in-app notification to all active registered users
    const allUsers = await User.find({ isActive: { $ne: false } }).select("_id name email role communicationPreferences");
    for (const u of allUsers) {
      const uidStr = u._id.toString();
      if (notifiedUserIds.has(uidStr)) continue;

      try {
        await sendNotification({
          userId: u._id,
          title,
          body,
          type: "OFFER",
          url: offerUrl,
        });

        // Email notification if opted in
        if (u.email && u.communicationPreferences?.emailChannel !== false) {
          sendEmail({
            to: u.email,
            subject: `🔥 ${title} - ${discountText}!`,
            text: `Hi ${u.name || "Customer"},\n\n${body}\n\nShop now: http://localhost:3000${offerUrl}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #3643ba; padding: 20px; color: #ffffff; text-align: center;">
                  <h2 style="margin: 0; font-size: 22px; font-weight: 800;">DECATHLON FLASH SALE</h2>
                  <p style="margin: 4px 0 0; font-size: 14px;">${badge}</p>
                </div>
                <div style="padding: 24px;">
                  <h3 style="color: #0f172a; margin-top: 0;">${offer.title}</h3>
                  <p style="font-size: 15px; color: #334155; line-height: 1.5;">${body}</p>
                  <div style="margin: 20px 0; padding: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; text-align: center;">
                    <span style="font-size: 20px; font-weight: 800; color: #059669;">${discountText}</span>
                  </div>
                  <a href="http://localhost:3000${offerUrl}" style="display: block; background: #3643ba; color: #ffffff; text-align: center; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 700;">
                    SHOP THE SALE NOW
                  </a>
                </div>
              </div>
            `,
          }).catch(() => {});
        }

        notifiedUserIds.add(uidStr);
        customerCount++;
      } catch (err) {}
    }

    // D. Send Web Push to ALL registered devices (Desktop & Mobile OS popups)
    const pushPayload = {
      title,
      body,
      icon: "/logo192.png",
      badge: "/favicon-32x32.png",
      data: { url: offerUrl, offerId: offer._id.toString(), type: "OFFER" },
      actions: [
        { action: "shop", title: "Shop Sale Now" },
        { action: "close", title: "Dismiss" },
      ],
    };
    sendPushToAllSubscribers(pushPayload).catch((e) => console.error("Broadcast push error:", e.message));

    // E. Notify Admins
    await sendAdminNotification({
      title: `🔥 Offer is Now LIVE: ${offer.title}`,
      body: `${badge}: ${discountText} on ${scopeSummary}.`,
      type: "OFFER",
      url: "/offers",
    });

    // F. Realtime Broadcast to All Connected Storefront Browsers (live toast)
    try {
      const io = getIO();
      if (io) {
        const livePayload = {
          offerId: offer._id,
          title,
          message: body,
          badgeLabel: badge,
          bannerText: offer.bannerText,
          status: "active",
          url: offerUrl,
          createdAt: new Date(),
        };
        io.emit("offer_alert", livePayload);
        emitHomepageUpdate("offer_started", livePayload);
      }
    } catch (e) {}

    // Update timestamps
    offer.startedNotifiedAt = new Date();
    offer.lastNotifiedAt = new Date();
    await Offer.findByIdAndUpdate(offer._id, {
      startedNotifiedAt: new Date(),
      lastNotifiedAt: new Date(),
    });

    console.log(`✓ Live Offer "${offer.title}" broadcast dispatched to ${customerCount} users + web push subscribers.`);
    return { success: true, notifiedCount: customerCount };
  } catch (error) {
    console.error("notifyOfferStarted Error:", error);
    return { success: false, notifiedCount: 0 };
  }
};

/**
 * Universal Offer Notifier - dispatches Scheduled or Started based on offer status & clock
 */
export const notifyUsersOfOffer = async (offerOrId, force = false) => {
  let offer = offerOrId;
  if (!offer || typeof offer === "string" || !offer.title) {
    offer = await Offer.findById(offer?._id || offer)
      .populate("applicableProducts", "name price discountPrice images")
      .populate("applicableCategories", "name image");
  }

  if (!offer || !offer.isActive) return { success: false, notifiedCount: 0 };

  const now = new Date();
  const isScheduled = offer.status === "scheduled" && new Date(offer.startDate) > now;

  if (isScheduled) {
    return notifyOfferScheduled(offer, force);
  } else {
    return notifyOfferStarted(offer, force);
  }
};
