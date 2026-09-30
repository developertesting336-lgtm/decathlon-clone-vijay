import StockNotification from "../models/StockNotification.js";
import Product from "../models/Product.js";
import { sendEmail } from "../utils/emailService.js";
import { sendNotification } from "./notificationService.js";
import { getIO } from "../socket/socketManager.js";

/**
 * Notify all subscribed users when a product is restocked (stock was 0, now > 0).
 * Reuses existing email, web push, and socket notifications safely.
 *
 * @param {Object|string} productOrId
 * @param {number} [oldStock]
 */
export const notifyRestockedSubscribers = async (productOrId, oldStock = 0) => {
  try {
    let product = productOrId;
    if (!product || typeof product === "string" || !product.name) {
      const id = product?._id || product;
      product = await Product.findById(id);
    }

    if (!product) return { notifiedCount: 0 };

    const currentStock = Number(product.stock || 0);
    if (currentStock <= 0) {
      return { notifiedCount: 0 };
    }

    // Find all unnotified subscriptions for this product
    const subscriptions = await StockNotification.find({
      product: product._id,
      notified: false,
    }).populate("user", "name email");

    if (!subscriptions || subscriptions.length === 0) {
      return { notifiedCount: 0 };
    }

    console.log(`📦 Found ${subscriptions.length} restock notification(s) for ${product.name}`);

    let io = null;
    try {
      io = getIO();
    } catch (e) {
      // Socket.io not initialized yet or in background script
    }

    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        const recipientEmail = sub.email || sub.user?.email;
        const recipientName = sub.user?.name || "Valued Customer";

        // 1. Send Email Notification
        if (recipientEmail) {
          sendEmail({
            to: recipientEmail,
            subject: `Back in Stock: ${product.name} is now available!`,
            text: `Hi ${recipientName},\n\nGreat news! "${product.name}" is back in stock at Decathlon for ₹${product.price}.\nAvailable stock: ${currentStock}.\n\nVisit Decathlon now to purchase before it sells out!`,
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="color: #0082c3; margin: 0; font-size: 26px;">Decathlon</h1>
                  <p style="color: #666; font-size: 14px; margin-top: 4px;">Sport for all | All for sport</p>
                </div>
                <div style="background-color: #f0f9ff; border-left: 4px solid #0082c3; padding: 14px 18px; border-radius: 4px; margin-bottom: 20px;">
                  <h3 style="margin: 0; color: #0082c3; font-size: 18px;">Good News! Back in Stock</h3>
                </div>
                <p style="font-size: 15px; color: #333;">Hi <strong>${recipientName}</strong>,</p>
                <p style="font-size: 14px; color: #555; line-height: 1.5;">
                  You asked us to let you know when <strong>${product.name}</strong> was back in stock. It is now available to order!
                </p>
                <div style="background-color: #fafafa; border: 1px solid #eaeaea; border-radius: 6px; padding: 16px; margin: 20px 0; text-align: center;">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #222;">${product.name}</h4>
                  <p style="font-size: 22px; font-weight: bold; color: #0082c3; margin: 6px 0;">₹${product.price}</p>
                  <p style="font-size: 13px; color: #28a745; margin: 4px 0; font-weight: 600;">✓ In Stock (${currentStock} items available)</p>
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
                  You received this email because you subscribed to restock notifications on Decathlon.
                </p>
              </div>
            `,
          }).catch((emailErr) => {
            console.warn(`Restock email failed for ${recipientEmail}:`, emailErr.message);
          });
        }

        // 2. In-App & Web Push Notification (if linked to a user account)
        if (sub.user) {
          const userId = sub.user._id || sub.user;
          sendNotification({
            userId,
            title: "Back in Stock!",
            body: `${product.name} is back in stock now! Only ${currentStock} available.`,
            type: "BACK_IN_STOCK",
            url: `/product/${product._id}`,
          }).catch((notifErr) => {
            console.warn(`Restock in-app notification failed for user ${userId}:`, notifErr.message);
          });

          // 3. Direct Socket.IO emission to user room
          if (io) {
            io.to(`user_${userId}`).emit("product_restocked", {
              productId: product._id,
              name: product.name,
              stock: currentStock,
              price: product.price,
              timestamp: Date.now(),
            });
          }
        }

        // 4. Update StockNotification record
        sub.notified = true;
        sub.notifiedAt = new Date();
        await sub.save();

        successCount++;
      } catch (subErr) {
        console.error(`Error processing restock notification for subscription ${sub._id}:`, subErr.message);
      }
    }

    // 5. Emit global realtime product update
    if (io) {
      io.emit("stock_updated", {
        productId: product._id,
        stock: currentStock,
        status: "in_stock",
      });
    }

    console.log(`✅ Successfully processed ${successCount} restock notification(s) for ${product.name}`);
    return { notifiedCount: successCount };
  } catch (error) {
    console.error("notifyRestockedSubscribers Error:", error);
    return { notifiedCount: 0, error: error.message };
  }
};
