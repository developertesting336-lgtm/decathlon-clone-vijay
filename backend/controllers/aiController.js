import Product from "../models/Product.js";
import Order from "../models/Order.js";
import AiKnowledge from "../models/AiKnowledge.js";
import Category from "../models/Category.js";
import AiChatHistory from "../models/AiChatHistory.js";
import SupportTicket from "../models/SupportTicket.js";
import {
  searchProducts,
  getUserOrders,
  getReturnPolicy,
  getRefundStatus,
  getPaymentStatus,
  getWarrantyInformation,
  getUserProfileHelp,
  createSupportRequest,
} from "../services/aiSupportService.js";
import { getIO } from "../socket/socketManager.js";

/*
=========================================================
DYNAMIC PRODUCT INSIGHTS GENERATOR
Computes real-time statistics directly from live MongoDB items
=========================================================
*/
function buildDynamicProductInsights(userQuery, products, maxPrice = null, inheritedTopic = null) {
  if (!products || products.length === 0) return "";

  const prices = products
    .map((p) => p.discountPrice || p.price)
    .filter((p) => p && p > 0);

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const highestPrice = prices.length ? Math.max(...prices) : 0;
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
  const inStockCount = products.filter((p) => (p.stock || 0) > 0).length;

  const deals = products.filter(
    (p) => p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price
  );

  const allSizes = [
    ...new Set(products.flatMap((p) => p.size || []).filter(Boolean)),
  ];

  let title = `### 🛒 Live Catalog Results (${products.length} item${products.length > 1 ? "s" : ""} found in database):`;
  if (maxPrice) {
    title = `### 🛒 Found ${products.length} in-stock item${products.length > 1 ? "s" : ""} under ₹${maxPrice.toLocaleString("en-IN")}:`;
  }

  let insight = `${title}\n\n`;

  if (inheritedTopic && maxPrice) {
    insight += `Here are the matching options fitting your budget of **under ₹${maxPrice.toLocaleString("en-IN")}**:\n\n`;
  }

  insight += `- 🏷️ **Price Range:** ₹${minPrice.toLocaleString("en-IN")}${
    highestPrice > minPrice ? ` — ₹${highestPrice.toLocaleString("en-IN")}` : ""
  }\n`;

  if (brands.length > 0) {
    insight += `- 🏅 **Brands in Stock:** ${brands.join(", ")}\n`;
  }

  if (deals.length > 0) {
    const topDeal = deals[0];
    const discount = Math.round(
      ((topDeal.price - topDeal.discountPrice) / topDeal.price) * 100
    );
    insight += `- 🔥 **Best Live Deal:** **${topDeal.name}** at **₹${topDeal.discountPrice.toLocaleString(
      "en-IN"
    )}** *(Save ${discount}%, Regular ₹${topDeal.price.toLocaleString("en-IN")})*\n`;
  }

  if (allSizes.length > 0) {
    insight += `- 📏 **Sizes Available:** ${allSizes.slice(0, 6).join(", ")}\n`;
  }

  insight += `- 📦 **Inventory Status:** ${inStockCount} of ${products.length} ready for immediate dispatch / 2-hr Click & Collect.\n\n`;
  insight += `Click any card below to view specifications, live stock, and size charts:`;

  return insight;
}

/*
=========================================================
AI CONTROLLER
=========================================================
*/
export const handleAIChat = async (req, res) => {
  try {
    const { message = "", history = [] } = req.body;
    const userQuery = message.trim();

    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const lowerQuery = userQuery.toLowerCase();
    const userId = req.user?.id || req.user?._id;

    // Normalize multi-turn history from client
    const normalizedHistory = Array.isArray(history)
      ? history
          .map((h) => {
            const role = (h.role || h.sender || "").toLowerCase();
            const isUser = role === "user";
            const text = h.content || h.text || h.message || "";
            return {
              role: isUser ? "user" : "model",
              sender: isUser ? "user" : "ai",
              text: text.trim(),
            };
          })
          .filter((h) => h.text.length > 0)
      : [];

    // Context resolution for follow-up queries (e.g. "under 3000", "for men")
    const { effectiveQuery, inheritedTopic } = resolveContextualQuery(
      userQuery,
      normalizedHistory
    );

    const priceFilter = extractPriceFilter(effectiveQuery);
    const maxPrice = priceFilter ? priceFilter.max : null;

    let responseType = "faq";
    let finalReply = "";
    let matchedProducts = [];
    let formattedOrders = [];
    let ticketInfo = null;
    let supportContext = "";
    let followUpSuggestions = [];

    // =========================================================
    // INTENT & ENTITY DETECTION
    // =========================================================
    const detectedGender = detectGender(effectiveQuery || userQuery);
    const detectedCategory = detectCategory(effectiveQuery || userQuery);

    let detectedIntent = "faq";
    let matchedKeywords = [];
    let relevanceScores = "";
    let finalSelected = "";

    const isHumanSupportQuery =
      /\b(talk to (agent|support|human)|speak (with|to) (agent|human)|human support|connect (me )?(to|with) (an? )?agent|customer support agent|live agent|talk to support|escalate)\b/i.test(
        lowerQuery
      );

    const isOrderQuery =
      !isHumanSupportQuery &&
      /\b(order|orders|tracking|track|delivery status|where is my (order|item|package)|when will my order arrive|recent orders)\b/i.test(
        lowerQuery
      );

    const isReturnQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      /\b(return|returns|how (can|do) i return|want to return|exchange|replace item|return policy|return a product|can i return)\b/i.test(
        lowerQuery
      );

    const isRefundQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      !isReturnQuery &&
      /\b(refund|refunds|where is my refund|refund status|how long (does )?a? refund take|money back|not received refund)\b/i.test(
        lowerQuery
      );

    const isPaymentQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      !isRefundQuery &&
      !isReturnQuery &&
      /\b(payment|payment failed|money deducted|pay using upi|how can i pay|upi|cod|credit card|card payment|payment issue|payment error)\b/i.test(
        lowerQuery
      );

    const isWarrantyQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      !isReturnQuery &&
      /\b(warranty|warranties|guarantee|what is your warranty|claim warranty|covered by warranty|2[- ]year warranty)\b/i.test(
        lowerQuery
      );

    const isAccountQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      !isReturnQuery &&
      /\b(profile|address|delivery address|change.*(address|profile|name|email|phone)|update.*(address|profile|name|email|phone)|forgot password|manage account|my account|account settings)\b/i.test(
        lowerQuery
      );

    const isShoppingQuery =
      !isHumanSupportQuery &&
      !isOrderQuery &&
      !isReturnQuery &&
      !isRefundQuery &&
      !isPaymentQuery &&
      !isWarrantyQuery &&
      !isAccountQuery &&
      detectShoppingIntent(effectiveQuery || userQuery);

    // =========================================================
    // 1. HUMAN SUPPORT / AGENT ESCALATION
    // =========================================================
    if (isHumanSupportQuery) {
      detectedIntent = "human_support";
      responseType = "human_support";
      finalSelected = "Human Support Escalation";
      if (userId) {
        finalReply = `I understand you would like to connect with a support agent. 🤝\n\nOur customer support team is available **Mon – Sun, 9:00 AM to 8:00 PM IST**.\n\nYou can click the button below to **open an official support ticket**, or we can assist you with your orders, returns, and products right here!`;
        supportContext = "Customer requested human support escalation. Offered ticket creation.";
      } else {
        finalReply = `Would you like to connect with a support agent? 🤝\n\nPlease **[Log In](/login)** to your Decathlon account so we can automatically pull up your orders and assign a support executive to your request!`;
        supportContext = "Customer asked for human agent while logged out.";
      }
      followUpSuggestions = [
        "Create Support Ticket",
        "Track My Order",
        "Return a Product",
        "Find a Product",
      ];
    }

    // =========================================================
    // 2. ORDER SUPPORT & TRACKING
    // =========================================================
    else if (isOrderQuery) {
      detectedIntent = "order_status";
      responseType = "order_status";
      finalSelected = "Order Support & Tracking";
      const matchedKnowledge = await findMatchingKnowledge(effectiveQuery || userQuery);
      if (matchedKnowledge) {
        matchedKeywords = matchedKnowledge.matchedKeywords || [];
        relevanceScores = `${matchedKnowledge.topic} (${matchedKnowledge.score})`;
      }

      if (userId) {
        const orderResult = await getUserOrders(userId, { limit: 3 });
        if (orderResult.success && orderResult.orders.length > 0) {
          formattedOrders = orderResult.orders;
          const latest = formattedOrders[0];
          finalReply = `📦 **Found ${formattedOrders.length} recent order${
            formattedOrders.length > 1 ? "s" : ""
          } in your account:**\n\n- **Order ID:** \`#${latest.shortId}\`\n- **Status:** **${latest.orderStatus.toUpperCase()}**\n- **Order Date:** ${latest.orderDate}\n- **Estimated Delivery:** **${latest.estDeliveryDate}**\n- **Total:** ₹${latest.totalAmount?.toLocaleString(
            "en-IN"
          )}\n- **Shipping to:** ${latest.deliveryAddress}\n\nYou can manage all items and live milestones directly in **[Orders & Returns](/account/orders-returns)**.`;

          if (matchedKnowledge && matchedKnowledge.answer) {
            finalReply += `\n\nℹ️ **Shipment Tracking Guide:**\n${matchedKnowledge.answer}`;
          }
          supportContext = `Customer has active order #${latest.shortId}, status: ${latest.orderStatus}, items: ${latest.itemsCount}, total: ₹${latest.totalAmount}.`;
        } else {
          finalReply = `I checked your Decathlon account, but found no active orders placed yet. 🏃‍♂️\n\n${
            matchedKnowledge?.answer || "Once you place an order, live shipping status and delivery tracking will update here automatically! Would you like help finding gear?"
          }`;
          supportContext = "User is logged in but has zero orders.";
        }
      } else {
        finalReply = `📦 **Order Tracking Information:**\n\n${
          matchedKnowledge?.answer || "You can track your order live by navigating to **[My Account > Orders & Returns](/account/orders-returns)**. Select your order to view current shipping milestones, courier partner details, and estimated delivery date."
        }\n\nTo view your active orders and delivery milestones right here, please **[Log In to your account](/login)**!`;
        supportContext = "User is not logged in to check orders.";
      }
      followUpSuggestions = generateFollowUpSuggestions(userQuery, [], matchedKnowledge);
    }

    // =========================================================
    // 3. RETURN SUPPORT
    // =========================================================
    else if (isReturnQuery) {
      detectedIntent = "return_info";
      responseType = "return_info";
      finalSelected = "Return Policy Help";
      const matchedKnowledge = await findMatchingKnowledge("return policy");
      if (matchedKnowledge) {
        matchedKeywords = matchedKnowledge.matchedKeywords || [];
        relevanceScores = `${matchedKnowledge.topic} (${matchedKnowledge.score})`;
      }

      const returnData = await getReturnPolicy();
      finalReply = `🔄 **${returnData.policyTitle}**\n\n` +
        returnData.highlights.map((h) => `- ${h}`).join("\n") +
        `\n\n**How to Return Online:**\n` +
        returnData.onlineReturnSteps.join("\n") +
        `\n\nReady to initiate? Visit **[My Account > Orders & Returns](/account/orders-returns)**!`;
      supportContext = "Provided 30-day return policy, online return steps, and store return guidance.";
      followUpSuggestions = [
        "Track My Order",
        "Where is my refund?",
        "Talk to Support",
      ];
    }

    // =========================================================
    // 4. REFUND SUPPORT
    // =========================================================
    else if (isRefundQuery) {
      detectedIntent = "refund_info";
      responseType = "refund_info";
      finalSelected = "Refund Status & Guidelines";
      const refundData = await getRefundStatus(userId);
      let userRefundNote = "";
      if (refundData.userRefunds && refundData.userRefunds.length > 0) {
        userRefundNote = `**Your Refund Activity:**\n` +
          refundData.userRefunds
            .map(
              (r) =>
                `- Order \`${r.orderId}\` (₹${r.totalAmount}): Status is **${r.orderStatus.toUpperCase()}** (${r.paymentStatus})`
            )
            .join("\n") +
          `\n\n`;
      }
      finalReply = `💰 **Decathlon Refund Guidelines & Timelines:**\n\n${userRefundNote}` +
        `- **Online Payments (UPI/Cards/NetBanking):** Refunds are processed within **5 to 7 business days** to your original payment source.\n` +
        `- **Cash on Delivery (COD):** Transferred directly via NEFT/UPI within **3 to 5 business days** once bank details are submitted.\n` +
        `- **In-Store Returns:** Instant store credit or immediate bank reversal when returned in person at any store.\n\n` +
        `Track return progress anytime under **[Orders & Returns](/account/orders-returns)**.`;
      supportContext = "Provided refund timelines: 5-7 days online, 3-5 days COD.";
      followUpSuggestions = [
        "Track My Order",
        "Payment Help",
        "Talk to Support",
      ];
    }

    // =========================================================
    // 5. PAYMENT SUPPORT (UPI, CARDS, NETBANKING)
    // =========================================================
    else if (isPaymentQuery) {
      detectedIntent = "payment_info";
      responseType = "payment_info";
      finalSelected = "Payment Support";
      const isUpiQuery = /\b(upi|gpay|phonepe|paytm)\b/i.test(lowerQuery);

      if (isUpiQuery) {
        finalReply = `💳 **Paying with UPI at Decathlon:**\n\n` +
          `You can pay securely using any UPI app or UPI ID on Decathlon!\n\n` +
          `- **Supported Apps:** Google Pay, PhonePe, Paytm, BHIM, and all bank UPI apps.\n` +
          `- **How to Pay:** Choose **UPI / QR Code** during checkout, scan the dynamic QR or enter your UPI ID, and approve the payment request in your UPI app.\n` +
          `- **Instant Confirmation:** Once approved, your order is confirmed immediately with zero transaction fees!\n` +
          `- **Refunds:** In case of a return or failed transaction, UPI refunds credit directly back to your linked bank account within 5-7 business days.`;
      } else {
        const paymentData = await getPaymentStatus(userId);
        let failedNote = "";
        if (paymentData.hasFailedOrPending) {
          failedNote = `⚠️ **Recent Payment Alert:**\n` +
            paymentData.pendingOrders
              .map((p) => `- Order \`${p.orderId}\` (₹${p.total}): Status **${p.status}**`)
              .join("\n") +
            `\n\n`;
        }
        finalReply = `💳 **Decathlon Payment Help:**\n\n${failedNote}` +
          `**Supported Payment Methods:**\n` +
          paymentData.paymentMethods.map((m) => `- ${m}`).join("\n") +
          `\n\n**If your money was debited but order failed:**\n` +
          paymentData.troubleshooting.map((t) => `- ${t}`).join("\n") +
          `\n\nNeed immediate payment resolution? You can reach our support team anytime!`;
      }
      supportContext = "Provided UPI and payment method guidance and troubleshooting.";
      followUpSuggestions = [
        "Track My Order",
        "Talk to Support",
        "Find a Product",
      ];
    }

    // =========================================================
    // 6. WARRANTY SUPPORT
    // =========================================================
    else if (isWarrantyQuery) {
      detectedIntent = "warranty_info";
      responseType = "warranty_info";
      finalSelected = "Warranty Information";
      const matchedKnowledge = await findMatchingKnowledge("warranty");
      if (matchedKnowledge) {
        matchedKeywords = matchedKnowledge.matchedKeywords || [];
        relevanceScores = `${matchedKnowledge.topic} (${matchedKnowledge.score})`;
      }

      const warrantyData = await getWarrantyInformation(lowerQuery);
      finalReply = `🛡️ **Decathlon Warranty & Guarantee:**\n\n` +
        `- **Standard Protection:** ${warrantyData.standardWarranty}\n\n` +
        `**Extended Coverage:**\n` +
        warrantyData.extendedWarranty.map((w) => `- ${w}`).join("\n") +
        `\n\n**How to Claim Warranty:**\n` +
        warrantyData.claimProcess.join("\n");
      supportContext = "Provided 2-year warranty details and claim instructions.";
      followUpSuggestions = [
        "Find a Product",
        "Return policy",
        "Talk to Support",
      ];
    }

    // =========================================================
    // 7. ACCOUNT & PROFILE HELP
    // =========================================================
    else if (isAccountQuery) {
      detectedIntent = "account_help";
      responseType = "account_help";
      finalSelected = "Account & Profile Guide";
      const accountData = await getUserProfileHelp(userId);
      let userGreeting = "";
      if (accountData.userData) {
        userGreeting = `Hello **${accountData.userData.name}**! You are logged in with **${accountData.userData.email}**.\n\n`;
      }
      finalReply = `👤 **Decathlon Account & Profile Guide:**\n\n${userGreeting}` +
        `- **Edit Profile & Name:** Visit **[My Account > Profile](/account)**\n` +
        `- **Manage Addresses:** Add or update shipping locations under **[My Account > Addresses](/account)**\n` +
        `- **View Orders:** Check purchase history in **[Orders & Returns](/account/orders-returns)**\n` +
        `- **Security:** Decathlon uses secure instant OTP verification sent directly to your registered phone/email.`;
      supportContext = "Guided user on profile, addresses, and order history navigation.";
      followUpSuggestions = [
        "Track My Order",
        "Return a Product",
        "Find a Product",
      ];
    }

    // =========================================================
    // 8. PRODUCT SEARCH / SHOPPING INTENT
    // =========================================================
    else if (isShoppingQuery) {
      detectedIntent = "product_search";
      responseType = "product_recommendation";

      matchedProducts = await searchProducts(effectiveQuery, {
        gender: detectedGender,
        maxPrice,
        limit: 6,
      });

      if (matchedProducts.length > 0) {
        let headline = "Here are some items you may like:";
        if (detectedGender && detectedCategory) {
          const g =
            detectedGender === "Men"
              ? "men's"
              : detectedGender === "Women"
              ? "women's"
              : "kids'";
          if (detectedCategory === "T-Shirts") headline = `Here are some ${g} T-shirts you may like.`;
          else if (detectedCategory === "Running Shoes") headline = `Here are some ${g} running shoes you may like.`;
          else if (detectedCategory === "Football Shoes") headline = `Here are some ${g} football shoes you may like.`;
          else if (detectedCategory === "Yoga Pants / Fitness") headline = `Here are some ${g} yoga pants you may like.`;
          else headline = `Here are some ${g} ${detectedCategory.toLowerCase()} you may like.`;
        } else if (detectedCategory) {
          if (detectedCategory === "Badminton") headline = `Here are some badminton gear and rackets you may like.`;
          else if (detectedCategory === "T-Shirts") headline = `Here are some T-shirts you may like.`;
          else if (detectedCategory === "Running Shoes") headline = `Here are some running shoes you may like.`;
          else if (detectedCategory === "Yoga Pants / Fitness") headline = `Here are some yoga and fitness gear you may like.`;
          else headline = `Here are some ${detectedCategory.toLowerCase()} you may like.`;
        } else if (detectedGender) {
          const g =
            detectedGender === "Men"
              ? "men's"
              : detectedGender === "Women"
              ? "women's"
              : "kids'";
          headline = `Here are some ${g} sportswear and gear you may like.`;
        }

        finalReply = `${headline}\n\n${buildDynamicProductInsights(
          effectiveQuery,
          matchedProducts,
          maxPrice,
          inheritedTopic
        )}`;
        finalSelected = `Product Search (${matchedProducts.length} items found)`;
        followUpSuggestions = generateFollowUpSuggestions(userQuery, matchedProducts);
      } else {
        // No live products found in stock: fallback to category guidance
        const matchedKnowledge = await findMatchingKnowledge(effectiveQuery);
        if (matchedKnowledge) {
          matchedKeywords = matchedKnowledge.matchedKeywords || [];
          relevanceScores = `${matchedKnowledge.topic} (${matchedKnowledge.score})`;
          finalReply = `${matchedKnowledge.answer}\n\nYou can browse our catalog or filter by size, color and price under **[All Products](/products)**!`;
          finalSelected = `Knowledge Guidance: ${matchedKnowledge.topic}`;
        } else {
          finalReply = `We couldn't find in-stock items matching that exact search, but we have a wide range of sportswear and gear available. You can browse our categories or filter by size, color, and price!`;
          finalSelected = "Product Search (0 items)";
        }
        followUpSuggestions = ["Find a Product", "Size Guide", "Return policy", "Talk to Support"];
      }
    }

    // =========================================================
    // 9. GENERAL AI KNOWLEDGE BASE LOOKUP
    // =========================================================
    else {
      const matchedKnowledge = await findMatchingKnowledge(effectiveQuery || userQuery);

      if (matchedKnowledge) {
        detectedIntent = "knowledge_faq";
        responseType = matchedKnowledge.category || "faq";
        supportContext = matchedKnowledge.answer;
        finalReply = matchedKnowledge.answer;
        matchedKeywords = matchedKnowledge.matchedKeywords || [];
        relevanceScores = `${matchedKnowledge.topic} (${matchedKnowledge.score})`;
        finalSelected = `Knowledge: ${matchedKnowledge.topic}`;
        followUpSuggestions = generateFollowUpSuggestions(userQuery, [], matchedKnowledge);
      } else if (isGreeting(lowerQuery)) {
        detectedIntent = "greeting";
        responseType = "greeting";
        finalSelected = "Greeting Welcome";
        let liveProductCount = 66;
        let liveCategoryCount = 125;
        try {
          const [pCount, cCount] = await Promise.all([
            Product.countDocuments({ isActive: true }),
            Category.countDocuments({ isActive: true }),
          ]);
          liveProductCount = pCount || liveProductCount;
          liveCategoryCount = cCount || liveCategoryCount;
        } catch (e) {}

        finalReply = `Hello! 👋 Welcome to **Decathlon Sports AI Assistant**.\n\nI have real-time access to our live database of **${liveProductCount}+ Sports Products** and store services.\n\nHow can I help you today? You can search for products, track orders, check returns, or ask about warranties!`;
        followUpSuggestions = [
          "Running shoes",
          "Trekking gear",
          "Return policy",
          "Track my order",
          "2-year warranty",
        ];
      } else {
        // Strict fallback when no knowledge reaches threshold and no intent matches
        detectedIntent = "unknown_fallback";
        responseType = "fallback";
        finalSelected = "Fallback (no match reached threshold)";
        finalReply = "I couldn't find an exact answer for that. Could you please provide a little more detail?";
        followUpSuggestions = [
          "Find a Product",
          "Track My Order",
          "Return policy",
          "Talk to Support",
        ];
      }
    }

    // =========================================================
    // TEMPORARY SERVER-SIDE DEBUG LOGGING (REQUIREMENT 11)
    // =========================================================
    console.log("\n================ AI CHAT DEBUG ================");
    console.log(`User Query:        "${userQuery}"`);
    console.log(`Normalized Query:  "${normalizeText(effectiveQuery || userQuery)}"`);
    console.log(`Detected Intent:   ${detectedIntent}`);
    console.log(`Detected Gender:   ${detectedGender || "None"}`);
    console.log(`Detected Category: ${detectedCategory || "None"}`);
    console.log(`Matched Keywords:  ${matchedKeywords.length > 0 ? matchedKeywords.join(", ") : "None"}`);
    console.log(`Relevance Scores:  ${relevanceScores || "N/A"}`);
    console.log(`Final Selected:    ${finalSelected}`);
    console.log("===============================================\n");

    // =========================================================
    // 10. GEMINI LLM GROUNDED GENERATION (IF CONFIGURED)
    // =========================================================
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !isOrderQuery && responseType !== "fallback") {
      try {
        const llmGenerated = await callGeminiLLM({
          apiKey: geminiKey,
          userQuery: effectiveQuery,
          history: normalizedHistory,
          products: matchedProducts,
          orderContext: formattedOrders.length > 0 ? JSON.stringify(formattedOrders[0]) : null,
          policyReply: responseType === "product_recommendation" ? "" : (supportContext || finalReply),
        });

        if (llmGenerated && llmGenerated.trim().length > 10) {
          // If product recommendations are active, append structured insights
          if (matchedProducts.length > 0) {
            finalReply = `${llmGenerated.trim()}\n\n---\n${buildDynamicProductInsights(
              effectiveQuery,
              matchedProducts,
              maxPrice,
              inheritedTopic
            )}`;
          } else {
            finalReply = llmGenerated.trim();
          }
        }
      } catch (geminiErr) {
        // Safe fallback to deterministic reply
      }
    }

    const formattedProducts = matchedProducts.map(formatProductForChat);

    // Save chat history for logged-in user in MongoDB
    if (userId) {
      try {
        await AiChatHistory.findOneAndUpdate(
          { user: userId },
          {
            $push: {
              messages: {
                $each: [
                  { sender: "user", text: userQuery, timestamp: new Date() },
                  {
                    sender: "ai",
                    text: finalReply,
                    products: formattedProducts,
                    orders: formattedOrders,
                    type: responseType,
                    suggestions: followUpSuggestions,
                    timestamp: new Date(),
                  },
                ],
              },
            },
          },
          { upsert: true, new: true }
        );
      } catch (histErr) {
        console.error("Failed to save chat history to MongoDB:", histErr);
      }
    }

    return res.status(200).json({
      success: true,
      type: responseType,
      reply: finalReply,
      products: formattedProducts,
      orders: formattedOrders,
      ticket: ticketInfo,
      suggestions: followUpSuggestions,
    });
  } catch (error) {
    console.error("AI Chatbot Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
      reply:
        "Sorry, I'm having trouble accessing that information right now. Please try again or talk to a support agent!",
      products: [],
      orders: [],
      suggestions: ["Track My Order", "Return policy", "Talk to Support"],
    });
  }
};

/*
=========================================================
GET USER CHAT HISTORY (CALLED AFTER LOGIN)
=========================================================
*/
export const getUserChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required to access saved chat history",
        messages: [],
      });
    }

    const history = await AiChatHistory.findOne({ user: userId }).lean();
    return res.status(200).json({
      success: true,
      messages: history?.messages || [],
    });
  } catch (error) {
    console.error("Get User Chat History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chat history",
      messages: [],
    });
  }
};

/*
=========================================================
CLEAR USER CHAT HISTORY
=========================================================
*/
export const clearUserChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required to clear chat history",
      });
    }

    await AiChatHistory.findOneAndDelete({ user: userId });
    return res.status(200).json({
      success: true,
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    console.error("Clear User Chat History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear chat history",
    });
  }
};

/*
=========================================================
HELPER FUNCTIONS
=========================================================
*/

/*
=========================================================
HIGH-PRECISION EXACT PRODUCT MATCHER & FILTER
Extracts user intent, category, gender, and price constraints
Ensures only exact matching product types are returned.
=========================================================
*/
/*
=========================================================
CONTEXTUAL QUERY RESOLVER FOR MULTI-TURN CONVERSATIONS
Carries over previous topic (e.g. shoes, cycles, t-shirts)
when the user sends a follow-up filter like "under 10000 only", "for men", etc.
=========================================================
*/
function resolveContextualQuery(userQuery, historyList = []) {
  const q = userQuery.toLowerCase().trim();

  // Check if current query already specifies an explicit item, category, or order intent
  const hasSpecificIntent =
    /\b(shoe|shoes|boot|boots|trainer|trainers|sneaker|sneakers|canvas|slipon|footwear|aquashoe|futsal|cleats|studs|cycle|cycles|bicycle|bicycles|bike|bikes|cycling|t-shirt|tshirt|tee|t-shirts|tshirts|jersey|short|shorts|pant|pants|trackpant|trackpants|jogger|joggers|jacket|jackets|raincoat|raincoats|poncho|ponchos|windcheater|umbrella|umbrellas|skate|skates|skating|inline|roller|waveboard|gym|workout|weight|weights|dumbbell|dumbbells|pull up|push up|vest|mat|tent|backpack|bag|football|cricket|swim|swimming|goggles|badminton|racket|order|tracking|delivery|return|warranty|exchange)\b/i.test(
      q
    );

  if (hasSpecificIntent || !Array.isArray(historyList) || historyList.length === 0) {
    return { effectiveQuery: userQuery, inheritedTopic: null };
  }

  // Current query is a modifier (e.g., "under 10000 only", "under 5000", "for men", "size 8", "black")
  // Search backward for the latest user query that mentioned a product/sport
  for (let i = historyList.length - 1; i >= 0; i--) {
    const turn = historyList[i];
    if (turn.role === "user" || turn.sender === "user") {
      const prevText = turn.text || turn.content || turn.message || "";
      const hasProduct =
        /\b(shoe|shoes|boot|boots|trainer|trainers|sneaker|sneakers|cycle|cycles|bicycle|bike|t-shirt|tshirt|tee|shorts|pant|pants|jacket|raincoat|poncho|umbrella|skate|gym|dumbbell|tent|bag|swim)\b/i.test(
          prevText
        );
      if (hasProduct) {
        return {
          effectiveQuery: `${prevText} ${userQuery}`,
          inheritedTopic: prevText,
        };
      }
    }
  }

  return { effectiveQuery: userQuery, inheritedTopic: null };
}

/*
=========================================================
HIGH-PRECISION EXACT PRODUCT MATCHER & FILTER
Extracts user intent, category, gender, and price constraints
Ensures only exact matching product types are returned.
=========================================================
*/
async function fetchExactMatchedProducts(userQuery) {
  if (!userQuery || !userQuery.trim()) return [];
  const q = userQuery.toLowerCase().trim();

  // 1. Detect target product types
  const isFootwear = /\b(shoe|shoes|boot|boots|trainer|trainers|sneaker|sneakers|canvas|slipon|footwear|aquashoe|futsal|cleats|studs)\b/i.test(q);
  const isCycle = /\b(cycle|cycles|bicycle|bicycles|bike|bikes|cycling)\b/i.test(q);
  const isTshirt = /\b(t-shirt|tshirt|tee|t-shirts|tshirts|jersey)\b/i.test(q);
  const isShorts = /\b(short|shorts)\b/i.test(q);
  const isPants = /\b(pant|pants|trackpant|trackpants|jogger|joggers)\b/i.test(q);
  const isJacket = /\b(jacket|jackets|raincoat|raincoats|poncho|ponchos|windcheater|parka)\b/i.test(q);
  const isUmbrella = /\b(umbrella|umbrellas)\b/i.test(q);
  const isSkate = /\b(skate|skates|skating|inline|roller|waveboard)\b/i.test(q);
  const isGym = /\b(gym|workout|weight|weights|dumbbell|dumbbells|pull up|push up|vest|handgrip|bar)\b/i.test(q);

  const hasSpecificType =
    isFootwear ||
    isCycle ||
    isTshirt ||
    isShorts ||
    isPants ||
    isJacket ||
    isUmbrella ||
    isSkate ||
    isGym;

  // 2. Detect gender
  const wantsMen = /\b(men|man|mens|male|boy|boys)\b/i.test(q) && !/\b(women|womens|female|girl|girls)\b/i.test(q);
  const wantsWomen = /\b(women|woman|womens|female|lady|ladies|girl|girls)\b/i.test(q);
  const wantsKids = /\b(kid|kids|child|children|junior)\b/i.test(q);

  // 3. Price filter
  const priceMatch = q.match(/(?:under|below|less than|budget|within|up to)\s*(?:rs\.?|inr|₹)?\s*(\d+[\d,]*)/i);
  const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : null;

  // 4. Fetch all active products
  const products = await Product.find({ isActive: true })
    .populate("category", "name slug")
    .lean();

  // If no category was named, but a price limit was asked (e.g. "under 10000 only"), return top products within budget!
  if (!hasSpecificType && maxPrice) {
    const budgetMatches = products.filter((p) => {
      const pGender = (p.gender || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      const titleHasWomen = /\b(women|womens|woman|ladies|girls)\b/i.test(pName);
      const titleHasMen =
        /\b(men|mens|man|boys)\b/i.test(pName) && !titleHasWomen;

      if (wantsMen && (pGender === "women" || titleHasWomen)) return false;
      if (wantsWomen && (pGender === "men" || titleHasMen)) return false;
      if (
        wantsKids &&
        pGender !== "kids" &&
        !pName.includes("kid") &&
        !pName.includes("child")
      )
        return false;

      const effectivePrice =
        p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
      return effectivePrice <= maxPrice;
    });

    budgetMatches.sort(
      (a, b) => (b.review || 0) - (a.review || 0) || a.price - b.price
    );
    return budgetMatches.slice(0, 6);
  }

  const queryWords = q
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scored = [];

  for (const p of products) {
    const pName = (p.name || "").toLowerCase();
    const pCat = (p.category?.name || "").toLowerCase();
    const pDesc = (p.description || "").toLowerCase();
    const pGender = (p.gender || "").toLowerCase();
    const effectivePrice =
      p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;

    // Price filtering
    if (maxPrice && effectivePrice > maxPrice) continue;

    // Strict gender exclusion
    const titleHasWomen = /\b(women|womens|woman|ladies|girls)\b/i.test(pName);
    const titleHasMen =
      /\b(men|mens|man|boys)\b/i.test(pName) && !titleHasWomen;

    if (wantsMen && (pGender === "women" || titleHasWomen)) continue;
    if (wantsWomen && (pGender === "men" || titleHasMen)) continue;
    if (
      wantsKids &&
      pGender !== "kids" &&
      !pName.includes("kid") &&
      !pName.includes("child")
    )
      continue;

    // Strict product type constraints
    if (isFootwear) {
      const isFootwearItem =
        /\b(shoe|shoes|boot|boots|trainer|trainers|canvas|slipon|aquashoe|futsal|sneaker)\b/i.test(
          pName
        ) || /\b(shoe|shoes|boot|boots|footwear)\b/i.test(pCat);
      if (!isFootwearItem) continue;
    }

    if (isCycle) {
      const isCycleItem =
        /\b(bike|bicycle|triban|rockrider|cycle)\b/i.test(pName) ||
        /\b(cycle|bike)\b/i.test(pCat);
      if (!isCycleItem) continue;
    }

    if (isTshirt) {
      const isTshirtItem =
        /\b(t-shirt|tshirt|tee shirt|jersey)\b/i.test(pName) ||
        /\bt-shirt\b/i.test(pCat);
      if (!isTshirtItem) continue;
    }

    if (isShorts) {
      const isShortsItem =
        /\b(short|shorts)\b/i.test(pName) || /\bshorts\b/i.test(pCat);
      if (!isShortsItem) continue;
    }

    if (isPants) {
      const isPantsItem =
        /\b(pant|pants|trackpant|trackpants|jogger)\b/i.test(pName) ||
        /\b(pant|trackpant)\b/i.test(pCat);
      if (!isPantsItem) continue;
    }

    if (isJacket) {
      const isJacketItem =
        /\b(jacket|raincoat|poncho|windproof)\b/i.test(pName) ||
        /\b(jacket|raincoat|poncho)\b/i.test(pCat);
      if (!isJacketItem) continue;
    }

    if (isUmbrella) {
      const isUmbrellaItem =
        /\bumbrella\b/i.test(pName) || /\bumbrella\b/i.test(pCat);
      if (!isUmbrellaItem) continue;
    }

    if (isSkate) {
      const isSkateItem =
        /\b(skate|skates|skating|inline|waveboard|canvas)\b/i.test(pName) ||
        /\bskating\b/i.test(pCat);
      if (!isSkateItem) continue;
    }

    if (isGym) {
      const isGymItem =
        /\b(weight|vest|dumbbell|dumbbells|pull up|push up|handgrip|bar|massage)\b/i.test(
          pName
        ) || /\b(strength|fitness|gym)\b/i.test(pCat);
      if (!isGymItem) continue;
    }

    // Relevance scoring
    let score = 0;

    // Base score for qualifying within requested product category
    if (hasSpecificType) score += 20;

    // Price qualification bonus
    if (maxPrice && effectivePrice <= maxPrice) score += 25;

    for (const w of queryWords) {
      if (pName.includes(w)) score += 10;
      if (pCat.includes(w)) score += 8;
      if (pDesc.includes(w)) score += 2;
    }

    // Sub-sport and keyword bonuses
    if (
      q.includes("hiking") &&
      (pName.includes("hiking") || pName.includes("trekking"))
    )
      score += 30;
    if (
      q.includes("running") &&
      (pName.includes("running") || pCat.includes("running"))
    )
      score += 30;
    if (
      q.includes("waterproof") &&
      (pName.includes("waterproof") || pName.includes("rain"))
    )
      score += 25;
    if (
      q.includes("rain") &&
      (pName.includes("rain") || pName.includes("waterproof"))
    )
      score += 20;
    if (wantsMen && (pGender === "men" || titleHasMen)) score += 15;
    if (wantsWomen && (pGender === "women" || titleHasWomen)) score += 15;

    // Brand bonus
    const pBrand = (p.brand || "").toLowerCase();
    if (pBrand && q.includes(pBrand)) score += 30;

    // Color bonus
    for (const color of [
      "black",
      "white",
      "blue",
      "navy",
      "green",
      "red",
      "grey",
      "khaki",
      "yellow",
      "orange",
    ]) {
      if (q.includes(color) && pName.includes(color)) score += 15;
    }

    if (score > 6) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((s) => s.product);
}

function isGreeting(text) {
  const greetings = [
    "hi",
    "hello",
    "hey",
    "hola",
    "namaste",
    "good morning",
    "good evening",
    "howdy",
    "sup",
  ];
  const clean = text.replace(/[^a-z ]/g, "").trim();
  return greetings.some((g) => clean === g || clean.startsWith(g + " "));
}

function extractProductKeywords(query) {
  const sportsTerms = [
    "cycle",
    "bicycle",
    "bike",
    "skate",
    "skates",
    "inline",
    "waveboard",
    "shoe",
    "shoes",
    "boot",
    "boots",
    "sneaker",
    "sneakers",
    "sandals",
    "t-shirt",
    "tshirt",
    "shirt",
    "jersey",
    "jacket",
    "shorts",
    "pants",
    "tracksuit",
    "leggings",
    "tights",
    "tent",
    "tents",
    "sleeping bag",
    "backpack",
    "bag",
    "pole",
    "trekking",
    "hiking",
    "camping",
    "racket",
    "racquet",
    "badminton",
    "tennis",
    "squash",
    "shuttle",
    "shuttlecock",
    "football",
    "soccer",
    "basketball",
    "volleyball",
    "cricket",
    "bat",
    "ball",
    "dumbbell",
    "dumbbells",
    "mat",
    "yoga",
    "gym",
    "workout",
    "protein",
    "skipping rope",
    "swim",
    "swimming",
    "goggles",
    "costume",
    "swimsuit",
    "towel",
    "rain",
    "waterproof",
    "monsoon",
    "poncho",
    "umbrella",
    "windcheater",
    "helmet",
    "gloves",
    "bottle",
    "socks",
    "cap",
  ];

  const brands = [
    "oxelo",
    "rockrider",
    "triban",
    "quechua",
    "forclaz",
    "kiprun",
    "domyos",
    "kalenji",
    "artengo",
    "kipsta",
    "btwin",
    "nabaiji",
    "fouganza",
    "solognac",
    "inesis",
    "caperlan",
    "itiwit",
  ];

  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, " ")
    .split(/\s+/);
  const found = new Set();

  for (const w of words) {
    if (sportsTerms.includes(w) || brands.includes(w)) {
      found.add(w);
    }
    if (w.endsWith("s") && sportsTerms.includes(w.slice(0, -1))) {
      found.add(w.slice(0, -1));
    }
  }

  if (found.size === 0) {
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "for",
      "in",
      "of",
      "to",
      "and",
      "or",
      "what",
      "which",
      "where",
      "how",
      "i",
      "need",
      "want",
      "show",
      "me",
      "find",
      "best",
      "good",
      "cheap",
      "under",
      "below",
    ]);
    for (const w of words) {
      if (w.length >= 3 && !stopwords.has(w)) {
        found.add(w);
      }
    }
  }

  return Array.from(found);
}

function extractPriceFilter(query) {
  const match = query.match(
    /(?:under|below|less than|within|budget)\s*(?:rs\.?|inr|₹)?\s*(\d+[\d,]*)/i
  );
  if (match) {
    const amount = parseInt(match[1].replace(/,/g, ""), 10);
    if (!isNaN(amount) && amount > 0) {
      return { max: amount };
    }
  }
  return null;
}

function formatProductForChat(p) {
  const id = p._id || p.id;
  const image = (Array.isArray(p.images) && p.images[0]) || p.image || "";
  const price = p.discountPrice || p.price || 0;
  const mrp = p.price && p.discountPrice ? p.price : 0;
  const discountPercent =
    mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : p.discountPercent || 0;

  return {
    id,
    name: p.name,
    brand: p.brand || "Decathlon",
    price,
    mrp: mrp > price ? mrp : null,
    discountPercent,
    image,
    rating: p.review || 4.5,
    onSale: Boolean(p.onSale || discountPercent > 0),
  };
}

function generateFollowUpSuggestions(query, products = [], matchedKnowledge = null) {
  if (matchedKnowledge) {
    switch (matchedKnowledge.category) {
      case "orders":
      case "cancellation":
        return ["Track My Order", "Order Cancellation", "Return a Product", "Talk to Support"];
      case "returns":
      case "refund":
        return ["Return Eligibility", "Refund Timeline", "Exchange Product", "Talk to Support"];
      case "payment":
        return ["UPI Payment", "Cash on Delivery", "Payment Pending", "Talk to Support"];
      case "sizing":
        return ["Size Guide", "Shoe Size", "Clothing Size", "Running Shoes"];
      case "delivery":
        return ["Delivery Time", "Shipping Charges", "Same Day Delivery", "Track My Order"];
      case "store":
        return ["Click & Collect", "Store Location", "Store Timings", "Bicycle Service"];
      case "account":
        return ["Update Profile", "Address Management", "Reset Password", "Order History"];
      case "products":
      case "sports_advice":
        return ["Running Shoes", "Trekking gear", "Size Guide", "Check return policy"];
      default:
        break;
    }
  }

  if (products && products.length > 0) {
    return [
      "Under ₹2,000 only",
      "What is 2-year warranty?",
      "Check return policy",
      "Where is my order?",
    ];
  }

  return [
    "Running shoes",
    "Trekking gear",
    "Return policy",
    "Track my order",
    "2-year warranty",
  ];
}

/**
 * Clean text for NLP matching (lowercase, strip special chars, collapse spaces)
 */
export function normalizeText(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s\-&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gender detection helper: Men, Women, Kids
 */
export function detectGender(query = "") {
  const q = String(query).toLowerCase();
  const hasWomen = /\b(women|womens|women's|female|lady|ladies|girl|girls)\b/i.test(q);
  const hasKids = /\b(kids|kid|children|child|junior)\b/i.test(q);
  const hasMen = /\b(men|mens|men's|male|boy|boys)\b/i.test(q);

  if (hasWomen) return "Women";
  if (hasKids) return "Kids";
  if (hasMen) return "Men";
  return null;
}

/**
 * Category detection helper
 */
export function detectCategory(query = "") {
  const q = String(query).toLowerCase();
  if (/\b(t-shirts?|tshirts?|tees?|polos?)\b/i.test(q)) return "T-Shirts";
  if (/\b(running shoes?|shoes? for running|jogging shoes?)\b/i.test(q)) return "Running Shoes";
  if (/\b(football shoes?|soccer shoes?|futsal shoes?|cleats?|studs?)\b/i.test(q)) return "Football Shoes";
  if (/\b(shoes?|boots?|trainers?|sneakers?|footwear)\b/i.test(q)) return "Shoes";
  if (/\b(yoga pants?|yoga leggings?|yoga|pilates)\b/i.test(q)) return "Yoga Pants / Fitness";
  if (/\b(track\s*pants?|trackpants?|joggers?|sweatpants?|tights|leggings?)\b/i.test(q)) return "Track Pants";
  if (/\b(shorts?|bermudas?)\b/i.test(q)) return "Shorts";
  if (/\b(shirts?|polo shirts?)\b/i.test(q)) return "Shirts";
  if (/\b(jackets?|windcheater|raincoats?|fleece|parka)\b/i.test(q)) return "Jackets";
  if (/\b(badminton|rackets?|racquets?|shuttlecock)\b/i.test(q)) return "Badminton";
  if (/\b(football|soccer|futsal)\b/i.test(q)) return "Football";
  if (/\b(basketball|hoop)\b/i.test(q)) return "Basketball";
  if (/\b(cycling|cycles?|bicycles?|bikes?)\b/i.test(q)) return "Cycling";
  if (/\b(swimming|swimwear|goggles)\b/i.test(q)) return "Swimming";
  if (/\b(gym|workout|dumbbells?|weights?)\b/i.test(q)) return "Gym & Fitness";
  if (/\b(backpacks?|bags?|rucksacks?)\b/i.test(q)) return "Bags & Backpacks";
  if (/\b(tents?|camping)\b/i.test(q)) return "Camping & Trekking";
  return null;
}

/**
 * Shopping / Product search intent detection helper
 */
export function detectShoppingIntent(query = "") {
  const q = String(query).toLowerCase();

  // Explicit shopping verbs/intent
  const hasShoppingAction =
    /\b(buy|show me|looking for|find|purchase|get me|shop for|recommend|search|price of|cost of|order product|browse|collection|catalog)\b/i.test(q);

  // Product noun terms
  const hasProductTerm =
    /\b(t-shirts?|tshirts?|shirts?|tees?|shoes?|boots?|sneakers?|trainers?|footwear|cleats?|studs?|shorts?|pants?|trackpants?|track\s*pants?|joggers?|leggings?|tights|jackets?|windcheater|raincoats?|hoodies?|bags?|backpacks?|rackets?|racquets?|bikes?|cycles?|bicycles?|dumbbells?|weights?|mat|gloves?|jerseys?|swimwear|goggles|tents?|sleeping bag|socks?|caps?|bottles?|helmets?|apparel|clothing|sportswear|activewear|gym wear)\b/i.test(q);

  return hasShoppingAction || hasProductTerm;
}

/**
 * Calculate relevance score between user query and topic title
 */
function computeTopicScore(topicNorm, queryNorm, queryTokens) {
  if (topicNorm === queryNorm) return 180;
  if (topicNorm.length > 3 && queryNorm.includes(topicNorm)) return 110;
  if (queryNorm.length > 3 && topicNorm.includes(queryNorm)) return 90;

  const topicTokens = topicNorm.split(/\s+/).filter((t) => t.length >= 3);
  const matchedTokens = topicTokens.filter((t) => queryTokens.includes(t));

  if (matchedTokens.length > 0 && matchedTokens.length === topicTokens.length) {
    return 70;
  }
  if (matchedTokens.length > 0) {
    return matchedTokens.length * 15;
  }
  return 0;
}

/**
 * Calculate highest relevance score among all keywords in a knowledge document
 */
function computeBestKeywordScore(keywords = [], queryNorm, queryTokens) {
  let bestScore = 0;
  let secondaryBonus = 0;
  const matchedKws = [];

  for (const kw of keywords) {
    const kwNorm = normalizeText(kw);
    if (!kwNorm) continue;

    let score = 0;
    if (kwNorm === queryNorm) {
      score = 160; // Exact keyword match
      matchedKws.push(kw);
    } else if (queryNorm.includes(kwNorm) && kwNorm.length >= 3) {
      score = kwNorm.includes(" ") ? 120 : 75; // Query contains full multi-word phrase
      matchedKws.push(kw);
    } else if (kwNorm.includes(queryNorm) && queryNorm.length >= 4) {
      score = 65;
      matchedKws.push(kw);
    } else {
      // Token-level overlap for multi-word keywords
      const kwTokens = kwNorm.split(/\s+/).filter((t) => t.length >= 3);
      const matched = kwTokens.filter((t) => queryTokens.includes(t));
      if (matched.length > 0 && matched.length === kwTokens.length) {
        score = 55 + matched.length * 10;
        matchedKws.push(kw);
      } else if (matched.length > 0) {
        score = matched.length * 8;
      }
    }

    if (score > bestScore) {
      secondaryBonus += Math.min(bestScore * 0.1, 15);
      bestScore = score;
    } else if (score >= 30) {
      secondaryBonus += Math.min(score * 0.08, 10);
    }
  }

  return {
    score: bestScore + Math.round(secondaryBonus),
    matchedKeywords: [...new Set(matchedKws)],
  };
}

/**
 * Intelligent Knowledge Base Matching Algorithm
 * Strictly enforces minimum confidence threshold (50) and domain clashing penalties.
 * NEVER returns random documents or documents solely matching words in answer.
 */
export async function findMatchingKnowledge(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") return null;
  const queryNorm = normalizeText(rawQuery);
  if (queryNorm.length < 2) return null;

  const queryTokens = queryNorm.split(/\s+/).filter((t) => t.length >= 2);

  // Clothing & apparel intent flag
  const isClothingQuery =
    /\b(t-shirts?|tshirts?|shirts?|tees?|shorts?|pants?|trackpants?|track\s*pants?|joggers?|leggings?|tights|jackets?|windcheater|raincoats?|clothing|apparel|sportswear|activewear|gym wear)\b/i.test(
      queryNorm
    );

  // Support / Policy query flag
  const isSupportQuery =
    /\b(order|orders|tracking|track|return|returns|refund|warranty|guarantee|upi|payment|cancel|cancellation)\b/i.test(
      queryNorm
    );

  try {
    const allDocs = await AiKnowledge.find({ isActive: true }).lean();
    if (!allDocs || allDocs.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;
    let bestMatchedKeywords = [];

    for (const doc of allDocs) {
      const topicNorm = normalizeText(doc.topic);
      const isSportsAdvice = doc.category === "sports_advice";

      // CLASH CHECK 1: If query is for apparel/clothing, sports_advice equipment docs (Basketball, Rackets, etc.) without apparel keywords get 0
      if (isClothingQuery && isSportsAdvice) {
        const hasApparelKw = (doc.keywords || []).some((k) =>
          /\b(t-shirt|tshirt|shirt|shorts|pant|pants|jacket|clothing|apparel|wear|tee)\b/i.test(k)
        );
        if (!hasApparelKw) continue;
      }

      // CLASH CHECK 2: If query is customer support / policy, sports_advice docs get 0
      if (isSupportQuery && isSportsAdvice) {
        continue;
      }

      // CLASH CHECK 3: Sport-to-sport clash (e.g. user asks football, do not return basketball or badminton)
      const isBasketball = /\b(basketball|hoop|tarmak)\b/i.test(queryNorm);
      const isBadminton = /\b(badminton|racket|racquet|shuttlecock)\b/i.test(queryNorm);
      const isFootball = /\b(football|soccer|futsal|kipsta)\b/i.test(queryNorm);

      if (isBasketball && !/\b(basketball|hoop|tarmak)\b/i.test(topicNorm)) {
        if (isSportsAdvice) continue;
      }
      if (isBadminton && !/\b(badminton|racket|racquet|artengo)\b/i.test(topicNorm)) {
        if (isSportsAdvice) continue;
      }
      if (isFootball && !/\b(football|soccer|kipsta)\b/i.test(topicNorm)) {
        if (isSportsAdvice) continue;
      }

      const topicScore = computeTopicScore(topicNorm, queryNorm, queryTokens);
      const kwResult = computeBestKeywordScore(doc.keywords || [], queryNorm, queryTokens);

      const totalScore = topicScore + kwResult.score;
      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestMatchedKeywords = kwResult.matchedKeywords;
        bestMatch = {
          topic: doc.topic,
          category: doc.category,
          answer: doc.answer,
          keywords: doc.keywords,
          matchedKeywords: bestMatchedKeywords,
          score: totalScore,
        };
      }
    }

    // Minimum confidence threshold: strictly require score >= 50
    if (bestMatch && highestScore >= 50) {
      return bestMatch;
    }
  } catch (err) {
    console.error("findMatchingKnowledge error:", err);
  }

  return null;
}

/*
=========================================================
EXTERNAL LLM INTEGRATIONS (GEMINI & OPENAI)
=========================================================
*/
async function callGeminiLLM({
  apiKey,
  userQuery,
  history,
  products,
  orderContext,
  policyReply,
}) {
  const productContext = products
    .map(
      (p) =>
        `- ${p.brand} ${p.name} (Live Price: ₹${p.discountPrice || p.price}${
          p.price && p.discountPrice ? `, Regular: ₹${p.price}` : ""
        })`
    )
    .join("\n");

  const systemInstruction = `You are the official Decathlon AI Sports & Shopping Assistant, powered by Google Gemini 1.5 Flash.
Your answers MUST be strictly grounded in the live Decathlon database items provided below.
CRITICAL RULES:
1. Recommend ONLY the exact products listed under "Live Catalog Items in Stock".
2. If the user asked for shoes, boots, or footwear, talk ONLY about footwear. Never introduce raincoats, tents, or other unrelated gear.
3. If the user asked for t-shirts, talk ONLY about t-shirts.
4. If the user asked for cycles, talk ONLY about bicycles/cycles.
5. If the user specified Men, Women, or Kids, adhere strictly to that gender.
Format your answer with concise, friendly markdown (bullet points, bold highlights, live prices).

Live Catalog Items in Stock:
${productContext || "No exact product matches currently in stock."}

${policyReply ? `Decathlon Verified Policy / Knowledge:\n${policyReply}\n` : ""}
${orderContext ? `Order Information:\n${orderContext}\n` : ""}

Never invent fake products or prices. Ground your answers strictly in the real catalog provided above!`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Multi-turn conversation history
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-6)) {
      const text = h.text || h.content || h.message;
      if (!text) continue;
      if (h.sender === "user" || h.role === "user") {
        contents.push({ role: "user", parts: [{ text }] });
      } else {
        contents.push({ role: "model", parts: [{ text }] });
      }
    }
  }
  contents.push({ role: "user", parts: [{ text: userQuery }] });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(3000),
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callOpenAILLM({
  apiKey,
  userQuery,
  history,
  products,
  orderContext,
  policyReply,
}) {
  const productContext = products
    .map(
      (p) =>
        `- ${p.brand} ${p.name} (Price: ₹${p.discountPrice || p.price})`
    )
    .join("\n");

  const messages = [
    {
      role: "system",
      content: `You are the official Decathlon AI Assistant. Ground all answers in live catalog data:
Live Catalog:
${productContext || "None"}
${policyReply ? `Verified Knowledge: ${policyReply}` : ""}
${orderContext ? `Order: ${orderContext}` : ""}`,
    },
    {
      role: "user",
      content: userQuery,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

/*
=========================================================
SUPPORT TICKET CONTROLLERS
=========================================================
*/

// POST /api/ai/support-ticket
export async function createUserSupportTicket(req, res) {
  try {
    const userId = req.user?.id || null;
    const { subject, category, message, priority, orderId, guestName, guestEmail } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    const result = await createSupportRequest(userId, {
      subject,
      category: category || "general",
      message,
      priority: priority || "MEDIUM",
      orderId: orderId || null,
      guestName: guestName || "",
      guestEmail: guestEmail || "",
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("createUserSupportTicket error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error creating support ticket",
    });
  }
}

// GET /api/ai/support-tickets (Admin only)
export async function getAdminSupportTickets(req, res) {
  try {
    const { status, category, search } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }
    if (category && category !== "ALL") {
      filter.category = category.toLowerCase();
    }
    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { guestName: { $regex: search, $options: "i" } },
        { guestEmail: { $regex: search, $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .populate("user", "name email phone")
      .populate("order", "totalAmount orderStatus createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("getAdminSupportTickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support tickets",
    });
  }
}

// PATCH /api/ai/support-ticket/:id (Admin only)
export async function updateSupportTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes, priority } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    if (status) ticket.status = status.toUpperCase();
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (priority) ticket.priority = priority.toUpperCase();

    await ticket.save();

    const updated = await SupportTicket.findById(id)
      .populate("user", "name email phone")
      .populate("order", "totalAmount orderStatus");

    // Emit live update
    try {
      const io = getIO();
      if (io) {
        io.emit("support_ticket_updated", {
          ticket: updated,
          timestamp: Date.now(),
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: "Support ticket updated successfully",
      ticket: updated,
    });
  } catch (error) {
    console.error("updateSupportTicketStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update support ticket",
    });
  }
}

// GET /api/ai/user-support-tickets (User's own tickets)
export async function getUserSupportTickets(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const tickets = await SupportTicket.find({ user: req.user.id })
      .populate("order", "totalAmount orderStatus createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error("getUserSupportTickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user support tickets",
    });
  }
}
