import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import AiKnowledge from "../models/AiKnowledge.js";
import SupportTicket from "../models/SupportTicket.js";
import { getIO } from "../socket/socketManager.js";

/*
=========================================================
1. PRODUCT HELP & SEARCH SERVICE
=========================================================
*/
export async function searchProducts(query, options = {}) {
  const { maxPrice = null, gender = null, limit = 6 } = options;
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase().trim();

  // Keyword extraction for sports & item types
  const isFootwear = /\b(shoes?|boots?|trainers?|sneakers?|canvas|slipon|footwear|aquashoe|futsal|cleats?|studs?)\b/i.test(q);
  const isCycle = /\b(cycles?|bicycles?|bikes?|cycling)\b/i.test(q);
  const isTshirt = /\b(t-shirts?|tshirts?|tees?|jerseys?|shirts?|polos?)\b/i.test(q);
  const isShorts = /\b(shorts?|bermudas?)\b/i.test(q);
  const isPants = /\b(pants?|trackpants?|track\s*pants?|joggers?|sweatpants?|tights|leggings?)\b/i.test(q);
  const isJacket = /\b(jackets?|raincoats?|ponchos?|windcheater|parka|fleece)\b/i.test(q);
  const isBackpack = /\b(bags?|backpacks?|rucksacks?|duffle|pouch)\b/i.test(q);
  const isTent = /\b(tents?|shelter|camping)\b/i.test(q);
  const isGym = /\b(gym|workout|weights?|dumbbells?|pull up|push up|vest|mat)\b/i.test(q);
  const isRacket = /\b(rackets?|racquets?|badminton|tennis|squash|shuttlecock)\b/i.test(q);
  const isFootball = /\b(football|soccer|futsal)\b/i.test(q);
  const isRunning = /\b(running|run|jogging)\b/i.test(q);
  const isYoga = /\b(yoga|pilates)\b/i.test(q);

  // Fetch active products
  let filter = { isActive: true };

  const wantsMen =
    gender === "Men" ||
    (/\b(men|man|mens|men's|male|boy|boys)\b/i.test(q) &&
      !/\b(women|womens|women's|female|girl|girls)\b/i.test(q));
  const wantsWomen =
    gender === "Women" ||
    /\b(women|woman|womens|women's|female|lady|ladies|girl|girls)\b/i.test(q);
  const wantsKids =
    gender === "Kids" || /\b(kid|kids|child|children|junior)\b/i.test(q);

  const allProducts = await Product.find(filter)
    .populate("category", "name slug")
    .lean();

  // Score & filter products
  const scored = allProducts.map((p) => {
    let score = 0;
    const pName = (p.name || "").toLowerCase();
    const pDesc = (p.description || "").toLowerCase();
    const pBrand = (p.brand || "").toLowerCase();
    const pGender = (p.gender || "").toLowerCase();
    const pCategory = (p.category?.name || "").toLowerCase();
    const effectivePrice =
      p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;

    // Price filtering
    if (maxPrice && effectivePrice > maxPrice) {
      return { product: p, score: -1 };
    }

    // Gender filtering
    if (wantsMen) {
      if (
        pGender === "women" ||
        pGender === "kids" ||
        /\b(women|womens|women's|female|girl|girls|kids|kid|child|children|junior)\b/i.test(pName)
      ) {
        return { product: p, score: -1 };
      }
      if (pGender === "men" || /\b(men|mens|men's)\b/i.test(pName)) {
        score += 20;
      }
    }

    if (wantsWomen) {
      if (
        pGender === "men" ||
        pGender === "kids" ||
        (/\b(men|mens|men's)\b/i.test(pName) &&
          !/\b(women|womens|women's)\b/i.test(pName)) ||
        /\b(kids|kid|child|children|junior|boy|boys)\b/i.test(pName)
      ) {
        return { product: p, score: -1 };
      }
      if (pGender === "women" || /\b(women|womens|women's)\b/i.test(pName)) {
        score += 20;
      }
    }

    if (wantsKids) {
      if (pGender !== "kids" && !/\b(kid|kids|child|children|junior)\b/i.test(pName)) {
        return { product: p, score: -1 };
      }
      if (pGender === "kids" || /\b(kid|kids|child)\b/i.test(pName)) {
        score += 20;
      }
    }

    // Specific category matching & non-match exclusion
    if (isTshirt) {
      const isProductTshirt =
        /\b(t-shirt|tshirt|tee|jersey|shirt|polo)\b/i.test(pName) ||
        pCategory.includes("t-shirt") ||
        pCategory.includes("shirt");
      if (isProductTshirt) {
        score += 35;
      } else {
        // If user asked for t-shirts, don't return shoes or balls
        return { product: p, score: -1 };
      }
    }

    if (isFootwear) {
      if (/\bskates?\b/i.test(pName)) return { product: p, score: -1 };
      const isProductFootwear =
        /\b(shoe|shoes|boot|boots|trainer|trainers|sneaker|sneakers|footwear|futsal|cleats?)\b/i.test(pName) ||
        pCategory.includes("shoe") ||
        pCategory.includes("footwear");
      if (isProductFootwear) {
        score += 35;
        if (isFootball && (/\b(football|futsal|cleat|stud|kipsta)\b/i.test(pName) || pCategory.includes("foot"))) {
          score += 30;
        }
        if (isRunning && (/\b(run|running|jogging|kiprun|kalenji)\b/i.test(pName) || pCategory.includes("run"))) {
          score += 25;
        }
      } else {
        return { product: p, score: -1 };
      }
    }

    if (isShorts) {
      const isProductShorts =
        /\b(short|shorts|bermuda)\b/i.test(pName) || pCategory.includes("short");
      if (isProductShorts) {
        score += 35;
      } else {
        return { product: p, score: -1 };
      }
    }

    if (isPants) {
      const isProductPants =
        /\b(pant|pants|trackpant|trackpants|jogger|joggers|sweatpants|tights|legging|leggings)\b/i.test(pName) ||
        pCategory.includes("pant") ||
        pCategory.includes("jogger") ||
        (isYoga && /\b(yoga|mat)\b/i.test(pName));
      if (isProductPants) {
        score += 35;
      } else if (!isYoga) {
        return { product: p, score: -1 };
      }
    }

    if (isJacket) {
      const isProductJacket =
        /\b(jacket|jackets|raincoat|poncho|windcheater|parka|fleece)\b/i.test(pName) ||
        pCategory.includes("jacket");
      if (isProductJacket) {
        score += 35;
      } else {
        return { product: p, score: -1 };
      }
    }

    if (isRacket) {
      const isProductRacket =
        /\b(racket|racquet|badminton|tennis|squash|shuttlecock)\b/i.test(pName) ||
        pCategory.includes("racket") ||
        pCategory.includes("badminton") ||
        pCategory.includes("tennis");
      if (isProductRacket) {
        score += 35;
      } else {
        return { product: p, score: -1 };
      }
    }

    if (isFootball) {
      if (/\b(football|soccer|futsal|kipsta)\b/i.test(pName) || pCategory.includes("foot")) {
        score += 20;
      }
    }

    if (isRunning) {
      if (/\b(running|run|kiprun|kalenji)\b/i.test(pName) || pCategory.includes("run")) {
        score += 20;
      }
    }

    if (isYoga) {
      if (/\b(yoga|pilates|tights|legging|mat)\b/i.test(pName) || pCategory.includes("yoga")) {
        score += 25;
      }
    }

    if (isCycle && (/\b(cycle|bicycle|bike)\b/i.test(pName) || pCategory.includes("cycl"))) score += 20;
    if (isBackpack && (/\b(bag|backpack|rucksack|pouch)\b/i.test(pName) || pCategory.includes("bag"))) score += 20;
    if (isTent && (/\b(tent|camping)\b/i.test(pName) || pCategory.includes("tent"))) score += 20;
    if (isGym && (/\b(dumbbell|weight|gym|mat|workout)\b/i.test(pName) || pCategory.includes("gym"))) score += 20;

    // Keyword matching
    const words = q.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (pName.includes(w)) score += 4;
      if (pCategory.includes(w)) score += 4;
      if (pBrand.includes(w)) score += 2;
      if (pDesc.includes(w)) score += 1;
    }

    // Boost reviews & discount
    if (p.discountPrice && p.discountPrice < p.price) score += 1;
    if (p.review) score += p.review * 0.5;

    return { product: p, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product)
    .slice(0, limit);

  return matched;
}

/*
=========================================================
2. USER ORDER TRACKING & STATUS SERVICE
=========================================================
*/
export async function getUserOrders(userId, options = {}) {
  if (!userId) return { success: false, message: "Authentication required", orders: [] };

  const { limit = 3, orderId = null } = options;

  try {
    let query = { user: userId };
    if (orderId) {
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        query._id = orderId;
      } else {
        // Match last 8 characters of hex or search
        const hexMatch = orderId.replace(/^#/, "").trim();
        if (hexMatch.length >= 6) {
          const userOrders = await Order.find({ user: userId }).sort({ createdAt: -1 });
          const matched = userOrders.find((o) =>
            o._id.toString().toLowerCase().endsWith(hexMatch.toLowerCase())
          );
          if (matched) query._id = matched._id;
        }
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedOrders = orders.map((o) => {
      const orderDate = new Date(o.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Estimated delivery date: 4 days after order creation
      const estDeliveryDate = new Date(
        new Date(o.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const items = (o.orderItems || []).map((item) => ({
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size || "",
        color: item.color || "",
      }));

      const shipping = o.shippingAddress || {};
      const addressString = [
        shipping.houseBuilding,
        shipping.streetLocality,
        shipping.cityState,
        shipping.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        id: o._id,
        shortId: String(o._id).slice(-8).toUpperCase(),
        orderDate,
        estDeliveryDate,
        orderStatus: o.orderStatus || "processing",
        paymentStatus: o.paymentStatus || "pending",
        paymentMethod: o.paymentMethod || "COD",
        subtotal: o.subtotal,
        totalAmount: o.totalAmount,
        itemsCount: items.reduce((acc, item) => acc + (item.quantity || 1), 0),
        items,
        deliveryAddress: addressString || "Standard Delivery Address",
        recipientName: `${shipping.firstName || ""} ${shipping.lastName || ""}`.trim() || "Customer",
        recipientMobile: shipping.mobile || "",
        isReturnEligible:
          o.orderStatus === "delivered" &&
          Date.now() - new Date(o.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000,
      };
    });

    return { success: true, orders: formattedOrders };
  } catch (error) {
    console.error("getUserOrders error:", error);
    return { success: false, message: "Failed to fetch orders", orders: [] };
  }
}

/*
=========================================================
3. RETURN POLICY & PROCESS SERVICE
=========================================================
*/
export async function getReturnPolicy() {
  return {
    policyTitle: "Decathlon 7-Day Hassle-Free Return & Exchange Policy",
    highlights: [
      "7-Day Window: Return unused items with original tags & packaging within 7 days of delivery.",
      "Online Returns: Initiate directly from My Account > Orders & Returns.",
      "In-Store Returns: Walk into any Decathlon store across India for instant return or exchange.",
      "Doorstep Pickup: Free pickup arranged for eligible return requests.",
      "Non-Returnable Items: Underwear, socks (once opened), swimsuits (without hygiene strip), and personalized items.",
    ],
    onlineReturnSteps: [
      "1. Go to My Account > Orders & Returns (/account/orders-returns).",
      "2. Select the order and choose 'Return / Replace'.",
      "3. Pick a reason and select Doorstep Pickup or Store Return.",
      "4. Our courier partner collects the package, and refund is initiated upon inspection.",
    ],
  };
}

/*
=========================================================
4. REFUND STATUS & TIMELINE SERVICE
=========================================================
*/
export async function getRefundStatus(userId) {
  let userRefundInfo = null;

  if (userId) {
    try {
      const orders = await Order.find({
        user: userId,
        $or: [
          { paymentStatus: "refunded" },
          { orderStatus: "refunded" },
          { orderStatus: "return_requested" },
          { orderStatus: "returned" },
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(2)
        .lean();

      if (orders.length > 0) {
        userRefundInfo = orders.map((o) => ({
          orderId: `#${String(o._id).slice(-8).toUpperCase()}`,
          totalAmount: o.totalAmount,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          updatedAt: new Date(o.updatedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }));
      }
    } catch (e) {
      console.error("Refund status query error:", e);
    }
  }

  return {
    userRefunds: userRefundInfo,
    timelines: {
      onlinePayment: "5 to 7 business days to original payment method (Cards/UPI/NetBanking).",
      codPayment: "3 to 5 business days via Bank Transfer / UPI after bank details are provided.",
      instantStoreReturn: "Instant store credit or original payment method refund when returned at store.",
    },
  };
}

/*
=========================================================
5. PAYMENT HELP & STATUS SERVICE
=========================================================
*/
export async function getPaymentStatus(userId) {
  let pendingOrders = [];
  if (userId) {
    try {
      pendingOrders = await Order.find({
        user: userId,
        $or: [{ paymentStatus: "failed" }, { paymentStatus: "pending" }],
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();
    } catch (e) {}
  }

  return {
    hasFailedOrPending: pendingOrders.length > 0,
    pendingOrders: pendingOrders.map((o) => ({
      orderId: `#${String(o._id).slice(-8).toUpperCase()}`,
      total: o.totalAmount,
      method: o.paymentMethod,
      status: o.paymentStatus,
    })),
    paymentMethods: [
      "UPI: Google Pay, PhonePe, Paytm, BHIM",
      "Cards: Visa, Mastercard, RuPay, Maestro Credit & Debit cards",
      "Net Banking: All major Indian banks",
      "Cash on Delivery (COD): Available on eligible pincodes",
    ],
    troubleshooting: [
      "If money was debited for a failed transaction, banks automatically reverse it within 2-4 business days.",
      "Ensure International/E-commerce transactions are enabled on your card in your banking app.",
      "You can re-try payment from My Account > Orders if the order is still pending.",
    ],
  };
}

/*
=========================================================
6. WARRANTY INFORMATION SERVICE
=========================================================
*/
export async function getWarrantyInformation(query = "") {
  return {
    standardWarranty: "Minimum 2-year warranty across all Decathlon brand products against manufacturing defects.",
    extendedWarranty: [
      "Bicycles: Lifetime warranty on B'Twin/Rockrider/Triban metal frames, rigid forks, and handlebars.",
      "Tents: 2 to 5-year guarantee on Quechua camping tents and shelter materials.",
      "Backpacks: Up to 10-year warranty on Quechua and Forclaz mountain hiking backpacks.",
    ],
    claimProcess: [
      "1. Bring your product to any Decathlon store across India.",
      "2. Provide your registered mobile number (paperless digital receipt lookup).",
      "3. Our sports technicians inspect the item for repair, replacement, or store voucher on the spot!",
    ],
  };
}

/*
=========================================================
7. ACCOUNT & PROFILE HELP SERVICE
=========================================================
*/
export async function getUserProfileHelp(userId) {
  let userData = null;
  if (userId) {
    try {
      userData = await User.findById(userId).select("name email phone").lean();
    } catch (e) {}
  }

  return {
    userData: userData
      ? {
          name: userData.name,
          email: userData.email || "Not set",
          phone: userData.phone || "Not set",
        }
      : null,
    navigationPaths: {
      profile: "/account",
      orders: "/account/orders-returns",
      addresses: "/account",
    },
    instructions: [
      "To update your name or phone number, visit My Account > Profile (/account).",
      "To add or change delivery addresses, visit My Account > Addresses.",
      "Passwordless login: Decathlon uses secure 6-digit OTP sent to your registered phone or email.",
    ],
  };
}

/*
=========================================================
8. SUPPORT TICKET CREATION & ESCALATION SERVICE
=========================================================
*/
export async function createSupportRequest(userId, ticketData) {
  if (!userId && !ticketData?.guestEmail) {
    return {
      success: false,
      message: "Please log in or provide your email address to submit a support request.",
    };
  }

  const {
    subject = "Customer Support Assistance",
    category = "general",
    message = "Assistance requested via AI Support Assistant",
    priority = "MEDIUM",
    orderId = null,
  } = ticketData;

  try {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `TIC-${randomCode}`;

    let orderObjectId = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      orderObjectId = new mongoose.Types.ObjectId(orderId);
    }

    const newTicket = await SupportTicket.create({
      user: userId || null,
      guestName: ticketData.guestName || "",
      guestEmail: ticketData.guestEmail || "",
      ticketId,
      subject,
      category,
      message,
      priority,
      order: orderObjectId,
      status: "OPEN",
    });

    // Populate user info for admin
    const populated = await SupportTicket.findById(newTicket._id)
      .populate("user", "name email phone")
      .populate("order", "totalAmount orderStatus");

    // Real-time notification to store administrators via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.emit("support_ticket_created", {
          ticket: populated,
          timestamp: Date.now(),
        });
      }
    } catch (socketErr) {
      // Non-fatal if socket not yet connected
    }

    return {
      success: true,
      ticket: {
        ticketId: newTicket.ticketId,
        subject: newTicket.subject,
        category: newTicket.category,
        status: newTicket.status,
        priority: newTicket.priority,
        createdAt: newTicket.createdAt,
      },
      message: `Support ticket #${ticketId} created successfully. Our team will review your request shortly!`,
    };
  } catch (error) {
    console.error("createSupportRequest error:", error);
    return { success: false, message: "Failed to create support ticket" };
  }
}
