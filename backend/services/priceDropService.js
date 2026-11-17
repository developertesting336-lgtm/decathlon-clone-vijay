import PriceAlert from "../models/PriceAlert.js";
import Wishlist from "../models/Wishlist.js";
import RecentlyViewed from "../models/RecentlyViewed.js";
import Product from "../models/Product.js";
import { sendEmail } from "../utils/emailService.js";
import { sendNotification } from "./notificationService.js";
import { sendPushToUser } from "./pushNotificationService.js";

/**
 * Check if a product price has dropped and notify tracking users, wishlist owners, and recent viewers.
 *
 * @param {Object|string} productOrId
 * @param {number} oldPrice - previous selling price
 * @param {number} newPrice - new lower selling price
 * @param {Object} [options] - optional metadata (offerTitle, type)
 * @returns {Promise<{ notifiedCount: number }>}
 */
export const checkAndNotifyPriceDrop = async (productOrId, oldPrice, newPrice, options = {}) => {
  try {
    const numOldPrice = Number(oldPrice || 0);
    const numNewPrice = Number(newPrice || 0);
    const { offerTitle = "", type: customType = "PRICE_DROP" } = options;

    // Only proceed if price actually decreased
    if (!numOldPrice || !numNewPrice || numNewPrice >= numOldPrice) {
      return { notifiedCount: 0 };
    }

    let product = productOrId;
    if (!product || typeof product === "string" || !product.name) {
      const id = product?._id || product;
      product = await Product.findById(id);
    }

    if (!product) return { notifiedCount: 0 };

    const dropAmount = numOldPrice - numNewPrice;
    const dropPercentage = Math.round((dropAmount / numOldPrice) * 100);

    if (dropAmount <= 0) return { notifiedCount: 0 };

    // 1. Fetch active explicit PriceAlert subscribers
    const alerts = await PriceAlert.find({
      product: product._id,
      isActive: true,
    }).populate("user", "name email");

    // 2. Fetch Wishlist owners tracking this product
    const wishlists = await Wishlist.find({
      $or: [
        { "items.product": product._id },
        { products: product._id },
      ],
    }).populate("user", "name email");

    // 3. Fetch Recently Viewed visitors tracking this product
    const recentViews = await RecentlyViewed.find({
      product: product._id,
    }).populate("user", "name email");

    const notifiedUserIds = new Set();
    let notifiedCount = 0;

    const productImage =
      product.images?.[0]?.url ||
      product.images?.[0] ||
      product.image ||
      "";

    const productUrl = `/product/${product._id}`;

    // A. Notify explicit Price Alert subscribers
    for (const alert of alerts) {
      try {
        if (alert.targetPrice && numNewPrice > alert.targetPrice) continue;
        if (alert.lastNotifiedPrice && numNewPrice >= alert.lastNotifiedPrice) continue;

        const recipientEmail = alert.email || alert.user?.email;
        const recipientName = alert.user?.name || "Customer";

        const title = offerTitle
          ? `🔥 ${offerTitle}: ${product.name} Price Drop!`
          : `🔥 Price Drop: ${product.name}`;
        const body = offerTitle
          ? `Special Offer discount! Price dropped by ${dropPercentage}% to ₹${numNewPrice.toLocaleString("en-IN")} (was ₹${numOldPrice.toLocaleString("en-IN")}). Save ₹${dropAmount.toLocaleString("en-IN")}!`
          : `Price dropped by ${dropPercentage}%! Now ₹${numNewPrice.toLocaleString("en-IN")} (was ₹${numOldPrice.toLocaleString("en-IN")}). You save ₹${dropAmount.toLocaleString("en-IN")}!`;

        if (alert.user?._id) {
          await sendNotification({
            userId: alert.user._id,
            title,
            body,
            type: customType || "PRICE_DROP",
            url: productUrl,
          });

          await sendPushToUser(alert.user._id, {
            title,
            body,
            icon: productImage || "/logo192.png",
            badge: "/favicon-32x32.png",
            data: {
              url: productUrl,
              productId: product._id.toString(),
              previousPrice: numOldPrice,
              currentPrice: numNewPrice,
              discountPercent: dropPercentage,
            },
            actions: [
              { action: "buy", title: "View & Buy Now" },
              { action: "close", title: "Dismiss" },
            ],
          });

          notifiedUserIds.add(alert.user._id.toString());
        }

        // Email Notification
        if (recipientEmail) {
          sendEmail({
            to: recipientEmail,
            subject: `🔥 ${offerTitle ? offerTitle + " - " : ""}Price Drop Alert: ${product.name} is now ${dropPercentage}% OFF!`,
            text: `Hi ${recipientName},\n\nGreat news! "${product.name}" has dropped in price from ₹${numOldPrice.toLocaleString("en-IN")} to ₹${numNewPrice.toLocaleString("en-IN")}.\nYou save ₹${dropAmount.toLocaleString("en-IN")} (${dropPercentage}% OFF)!\n\nView and purchase now: http://localhost:3000/product/${product._id}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #3643ba; padding: 20px; color: #ffffff; text-align: center;">
                  <h2 style="margin: 0; font-size: 22px; font-weight: 800;">${offerTitle ? offerTitle.toUpperCase() : "DECATHLON PRICE DROP ALERT"}</h2>
                </div>
                <div style="padding: 24px;">
                  <p style="font-size: 15px; color: #334155;">Hi ${recipientName},</p>
                  <p style="font-size: 15px; color: #334155;">Great news! A product you are tracking is now on sale:</p>
                  
                  <div style="display: flex; gap: 16px; margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                    <div>
                      <h3 style="margin: 0 0 10px; font-size: 16px; color: #0f172a;">${product.name}</h3>
                      <p style="margin: 4px 0; color: #94a3b8; text-decoration: line-through; font-size: 13px;">Previous Price: ₹${numOldPrice.toLocaleString("en-IN")}</p>
                      <p style="margin: 4px 0; font-size: 22px; font-weight: 800; color: #3643ba;">Current Price: ₹${numNewPrice.toLocaleString("en-IN")}</p>
                      <span style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 4px; margin-top: 6px;">
                        SAVE ₹${dropAmount.toLocaleString("en-IN")} (${dropPercentage}% OFF)
                      </span>
                    </div>
                  </div>

                  <a href="http://localhost:3000/product/${product._id}" style="display: block; background: #3643ba; color: #ffffff; text-align: center; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                    VIEW PRODUCT & BUY NOW
                  </a>
                </div>
              </div>
            `,
          }).catch((err) => console.error("Price drop email error:", err.message));
        }

        alert.lastNotifiedPrice = numNewPrice;
        await alert.save();
        notifiedCount++;
      } catch (alertErr) {
        console.error("Error processing price alert:", alertErr);
      }
    }

    // B. Notify Wishlist owners who weren't already explicitly alerted
    for (const wl of wishlists) {
      try {
        if (!wl.user || !wl.user._id || notifiedUserIds.has(wl.user._id.toString())) continue;

        const title = offerTitle
          ? `🏷️ ${offerTitle}: ${product.name}`
          : `🏷️ Wishlist Price Drop: ${product.name}`;
        const body = offerTitle
          ? `An item in your wishlist has a promotional discount! Now ₹${numNewPrice.toLocaleString("en-IN")} (${dropPercentage}% OFF).`
          : `An item in your wishlist dropped by ${dropPercentage}%! Now ₹${numNewPrice.toLocaleString("en-IN")} (was ₹${numOldPrice.toLocaleString("en-IN")}).`;

        await sendNotification({
          userId: wl.user._id,
          title,
          body,
          type: customType || "PRICE_DROP",
          url: productUrl,
        });

        await sendPushToUser(wl.user._id, {
          title,
          body,
          icon: productImage || "/logo192.png",
          badge: "/favicon-32x32.png",
          data: {
            url: productUrl,
            productId: product._id.toString(),
            previousPrice: numOldPrice,
            currentPrice: numNewPrice,
            discountPercent: dropPercentage,
          },
        });

        notifiedUserIds.add(wl.user._id.toString());
        notifiedCount++;
      } catch (wlErr) {
        console.error("Error notifying wishlist owner:", wlErr);
      }
    }

    // C. Notify Recently Viewed users whose viewed price is higher than the new price
    for (const rv of recentViews) {
      try {
        if (!rv.user || !rv.user._id || notifiedUserIds.has(rv.user._id.toString())) continue;

        // Only notify if price dropped below the price when they viewed it
        if (rv.viewedPrice && numNewPrice >= rv.viewedPrice) continue;
        if (rv.lastNotifiedPrice && numNewPrice >= rv.lastNotifiedPrice) continue;

        const rvDropAmount = (rv.viewedPrice || numOldPrice) - numNewPrice;
        const rvDropPercentage = Math.round((rvDropAmount / (rv.viewedPrice || numOldPrice)) * 100);

        const title = offerTitle
          ? `👀 ${offerTitle}: Price Drop on Item You Viewed!`
          : `👀 Price Drop on Item You Viewed: ${product.name}`;
        const body = `Good news! "${product.name}" that you viewed recently has dropped to ₹${numNewPrice.toLocaleString("en-IN")} (was ₹${(rv.viewedPrice || numOldPrice).toLocaleString("en-IN")})! Grab it now.`;

        await sendNotification({
          userId: rv.user._id,
          title,
          body,
          type: customType || "PRICE_DROP",
          url: productUrl,
        });

        await sendPushToUser(rv.user._id, {
          title,
          body,
          icon: productImage || "/logo192.png",
          badge: "/favicon-32x32.png",
          data: {
            url: productUrl,
            productId: product._id.toString(),
            previousPrice: rv.viewedPrice || numOldPrice,
            currentPrice: numNewPrice,
            discountPercent: rvDropPercentage,
          },
        });

        rv.lastNotifiedPrice = numNewPrice;
        await rv.save();

        notifiedUserIds.add(rv.user._id.toString());
        notifiedCount++;
      } catch (rvErr) {
        console.error("Error notifying recently viewed user:", rvErr);
      }
    }

    console.log(`✓ Price drop & discount alerts dispatched to ${notifiedCount} user(s) for "${product.name}"`);
    return { notifiedCount };
  } catch (error) {
    console.error("checkAndNotifyPriceDrop Error:", error);
    return { notifiedCount: 0 };
  }
};

/**
 * Periodically scan active discounts and notify Wishlist & Recently Viewed users who haven't been alerted.
 */
export const scanAndNotifyDiscountedWishlistAndRecent = async () => {
  try {
    // Find products with active discount prices
    const discountedProducts = await Product.find({
      discountPrice: { $gt: 0 },
      isActive: { $ne: false },
    }).lean();

    let totalAlerts = 0;

    for (const prod of discountedProducts) {
      if (!prod.price || !prod.discountPrice || prod.discountPrice >= prod.price) continue;

      const currentDiscountPrice = Number(prod.discountPrice);
      const originalPrice = Number(prod.price);
      const dropPercentage = Math.round(((originalPrice - currentDiscountPrice) / originalPrice) * 100);
      const productUrl = `/product/${prod._id}`;
      const productImage = prod.images?.[0]?.url || prod.images?.[0] || prod.image || "";

      // 1. Scan Recently Viewed
      const recentViews = await RecentlyViewed.find({
        product: prod._id,
        $or: [
          { lastNotifiedPrice: null },
          { lastNotifiedPrice: { $gt: currentDiscountPrice } },
        ],
      }).populate("user", "name email");

      for (const rv of recentViews) {
        if (!rv.user?._id) continue;
        if (rv.viewedPrice && currentDiscountPrice >= rv.viewedPrice) continue;

        try {
          const title = `👀 Price Drop: ${prod.name}`;
          const body = `An item you recently browsed dropped to ₹${currentDiscountPrice.toLocaleString("en-IN")} (${dropPercentage}% OFF)!`;

          await sendNotification({
            userId: rv.user._id,
            title,
            body,
            type: "PRICE_DROP",
            url: productUrl,
          });

          await sendPushToUser(rv.user._id, {
            title,
            body,
            icon: productImage || "/logo192.png",
            data: { url: productUrl, productId: prod._id.toString() },
          });

          rv.lastNotifiedPrice = currentDiscountPrice;
          await rv.save();
          totalAlerts++;
        } catch (err) {
          console.warn("Scan notify RV error:", err.message);
        }
      }
    }

    if (totalAlerts > 0) {
      console.log(`✓ Periodic discount scan dispatched ${totalAlerts} new alert(s)`);
    }

    return { totalAlerts };
  } catch (error) {
    console.error("scanAndNotifyDiscountedWishlistAndRecent Error:", error.message);
    return { totalAlerts: 0 };
  }
};
