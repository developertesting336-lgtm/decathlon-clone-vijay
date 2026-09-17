import dns from "dns";
dns.setServers(["8.8.8.8"]);
import mongoose from "mongoose";
import "dotenv/config";
import AiKnowledge from "./models/AiKnowledge.js";

export const initialKnowledge = [
  // =========================================================
  // 1. CUSTOMER SUPPORT
  // =========================================================
  {
    topic: "Order Tracking",
    category: "orders",
    keywords: [
      "order tracking",
      "track order",
      "where is my order",
      "order status",
      "track package",
      "track shipment",
      "delivery status",
      "tracking link",
      "where is my item",
    ],
    answer:
      "You can track your order live by navigating to **My Account > Orders & Returns** (/account/orders-returns). Select your order to view current shipping milestones, courier partner details, and estimated delivery date.",
    isActive: true,
  },
  {
    topic: "Change Delivery Address",
    category: "orders",
    keywords: [
      "change delivery address",
      "update address",
      "wrong address",
      "change shipping address",
      "modify delivery address",
      "address correction",
      "edit address for order",
    ],
    answer:
      "If your order has not been dispatched yet, you can change your delivery address under **My Account > Orders**. Once the order has shipped, please contact our support team immediately or request the courier partner during out-for-delivery confirmation.",
    isActive: true,
  },
  {
    topic: "Missing Product From Order",
    category: "orders",
    keywords: [
      "missing product",
      "missing item",
      "item missing from order",
      "incomplete delivery",
      "did not receive all items",
      "package incomplete",
      "item left out",
    ],
    answer:
      "Multi-item orders may be shipped in separate packages from different warehouses. Check your order tracking for multiple tracking numbers. If all packages are delivered and an item is still missing, please submit a support ticket with your order ID within 48 hours.",
    isActive: true,
  },
  {
    topic: "Damaged Product Received",
    category: "orders",
    keywords: [
      "damaged product",
      "damaged item",
      "broken product",
      "received damaged",
      "defective item",
      "cracked product",
      "torn packaging",
      "damaged in transit",
    ],
    answer:
      "We apologize for the inconvenience! Please go to **My Account > Orders & Returns**, select the item, and choose **Return / Exchange > Damaged Product**. Upload clear photos of the damage for an instant replacement or full refund.",
    isActive: true,
  },
  {
    topic: "Wrong Product Received",
    category: "orders",
    keywords: [
      "wrong product",
      "wrong item",
      "wrong shoes",
      "received incorrect item",
      "different product",
      "wrong color received",
      "wrong model",
      "wrong size delivered",
    ],
    answer:
      "If you received the wrong item, color, or model, initiate a return from **My Account > Orders & Returns** under **Wrong Product Received**. We will arrange a free doorstep pickup and dispatch the correct product immediately.",
    isActive: true,
  },
  {
    topic: "Refund Status",
    category: "refund",
    keywords: [
      "refund status",
      "where is my refund",
      "refund pending",
      "when will i get refund",
      "check refund",
      "money not received",
      "refund delay",
      "track refund",
    ],
    answer:
      "Once an item is received and inspected at our warehouse or store, refunds are processed within 24 hours. Online payments (Cards/UPI) typically reflect in your account within **5 to 7 business days** depending on your bank.",
    isActive: true,
  },
  {
    topic: "Order Cancellation",
    category: "cancellation",
    keywords: [
      "cancel order",
      "order cancellation",
      "how to cancel order",
      "stop delivery",
      "cancel my item",
      "cancellation request",
      "do not want order",
    ],
    answer:
      "You can cancel your order directly from **My Account > Orders** as long as it is in the 'Pending' or 'Processing' stage before dispatch. Once dispatched, simply decline the delivery at your doorstep for a full refund.",
    isActive: true,
  },
  {
    topic: "Failed Payment",
    category: "payment",
    keywords: [
      "failed payment",
      "payment failed",
      "transaction failed",
      "money deducted but order failed",
      "payment unsuccessful",
      "payment error",
      "declined payment",
    ],
    answer:
      "If a payment fails but money was deducted from your account, banks automatically reverse the amount within **2 to 4 business days**. You can safely retry checkout using UPI, Cards, or Cash on Delivery.",
    isActive: true,
  },
  {
    topic: "Payment Pending",
    category: "payment",
    keywords: [
      "payment pending",
      "payment processing",
      "waiting for payment confirmation",
      "payment under review",
      "upi payment pending",
      "bank confirmation pending",
    ],
    answer:
      "Pending payments are usually confirmed by banks within 15 to 30 minutes. Once confirmed, your order status will automatically update to 'Confirmed'. If the transaction fails, the deducted amount will be refunded to your source account.",
    isActive: true,
  },
  {
    topic: "Payment Successful but Order Not Created",
    category: "payment",
    keywords: [
      "payment successful but order not created",
      "money debited order not showing",
      "paid but no order",
      "amount deducted but order not placed",
      "payment success no order id",
    ],
    answer:
      "If payment succeeded but no order appears under My Account within 15 minutes, please share your payment reference (UTR or Stripe transaction ID) with our customer support team or create a ticket so we can reconcile and confirm your order.",
    isActive: true,
  },
  {
    topic: "Invoice / Order Receipt",
    category: "orders",
    keywords: [
      "invoice",
      "order receipt",
      "download invoice",
      "tax invoice",
      "bill",
      "gst invoice",
      "purchase receipt",
      "warranty invoice",
    ],
    answer:
      "You can view and download tax invoices anytime from **My Account > Orders & Returns**. Open the relevant order and click **Download Invoice**. Invoices are also emailed to your registered address upon order shipment.",
    isActive: true,
  },
  {
    topic: "Order History",
    category: "orders",
    keywords: [
      "order history",
      "past orders",
      "previous purchases",
      "view my orders",
      "all orders",
      "my purchase history",
      "earlier orders",
    ],
    answer:
      "Your complete purchase history (both online and in-store purchases linked to your mobile number) is saved under **My Account > Orders & Returns** (/account/orders-returns).",
    isActive: true,
  },
  {
    topic: "Reorder Product",
    category: "orders",
    keywords: [
      "reorder product",
      "buy again",
      "reorder",
      "order again",
      "repeat order",
      "repurchase item",
    ],
    answer:
      "To reorder a previously purchased item, go to **My Account > Orders**, locate the delivered order, and click **Buy Again** to quickly add the same products with your chosen sizes to your cart.",
    isActive: true,
  },
  {
    topic: "Delivery Attempt Failed",
    category: "delivery",
    keywords: [
      "delivery attempt failed",
      "delivery missed",
      "courier could not deliver",
      "missed delivery",
      "reattempt delivery",
      "undelivered package",
      "customer not available",
    ],
    answer:
      "If you missed your delivery, our courier partner will automatically reattempt delivery on the next working day. You will receive an SMS/WhatsApp notification with the delivery executive's contact number.",
    isActive: true,
  },
  {
    topic: "Delivery Delayed",
    category: "delivery",
    keywords: [
      "delivery delayed",
      "order delayed",
      "shipment late",
      "delivery taking too long",
      "delayed package",
      "why is delivery late",
    ],
    answer:
      "Shipments may face minor delays due to adverse weather, regional transit restrictions, or public holidays. Check your live tracking link in **My Account > Orders** for the updated estimated delivery date.",
    isActive: true,
  },
  {
    topic: "Package Not Received",
    category: "delivery",
    keywords: [
      "package not received",
      "marked delivered but not received",
      "did not receive package",
      "order not delivered",
      "haven't received my order",
      "fake delivery",
    ],
    answer:
      "If your order shows 'Delivered' but you haven't received it, check with family members, neighbors, or building security first. If still not found, please contact support within 48 hours for immediate investigation with the courier.",
    isActive: true,
  },
  {
    topic: "Partial Order Delivery",
    category: "delivery",
    keywords: [
      "partial order delivery",
      "partial delivery",
      "only one item delivered",
      "half order arrived",
      "split shipment",
      "missing part of shipment",
    ],
    answer:
      "When items originate from different regional fulfillment centers, they ship in separate parcels to reach you as fast as possible. Track each individual package under **My Account > Orders**.",
    isActive: true,
  },

  // =========================================================
  // 2. RETURNS / REFUNDS
  // =========================================================
  {
    topic: "Return Product",
    category: "returns",
    keywords: [
      "return product",
      "how to return",
      "initiate return",
      "online return",
      "return item",
      "return request",
      "send back item",
    ],
    answer:
      "Decathlon offers a **30-day return policy** for unused products with original tags intact. Go to **My Account > Orders & Returns**, select the item, and choose Doorstep Pickup or Walk-in Return at any Decathlon store across India.",
    isActive: true,
  },
  {
    topic: "Exchange Product",
    category: "returns",
    keywords: [
      "exchange product",
      "exchange item",
      "replace product",
      "product replacement",
      "swap size",
      "size exchange",
      "color exchange",
    ],
    answer:
      "You can exchange any product for a different size or color online via **My Account > Orders & Returns**, or walk into any Decathlon store across India for an instant, on-the-spot size exchange.",
    isActive: true,
  },
  {
    topic: "Return Eligibility",
    category: "returns",
    keywords: [
      "can i return this product",
      "return eligibility",
      "return window",
      "is product returnable",
      "non returnable items",
      "return policy days",
      "eligibility check",
    ],
    answer:
      "Products are eligible for return within 30 days of delivery if they are unused, unwashed, and have original tags & packaging. For hygiene reasons, underwear, opened socks, and swimwear without hygiene strips cannot be returned.",
    isActive: true,
  },
  {
    topic: "Return Pickup",
    category: "returns",
    keywords: [
      "return pickup",
      "pickup courier",
      "when will return be picked up",
      "doorstep pickup for return",
      "return pickup delayed",
      "courier pickup",
    ],
    answer:
      "Once you submit a return request, our courier partner typically collects the package within **2 to 3 business days**. Please ensure the product is packed with all original tags, accessories, and manuals.",
    isActive: true,
  },
  {
    topic: "Return Request Status",
    category: "returns",
    keywords: [
      "return request status",
      "track return",
      "return status",
      "check return request",
      "return approval status",
      "pickup status",
    ],
    answer:
      "You can monitor the live progress of your return request (Requested > Pickup Scheduled > Picked Up > Refund Initiated) under **My Account > Orders & Returns**.",
    isActive: true,
  },
  {
    topic: "Refund Pending",
    category: "refund",
    keywords: [
      "refund pending",
      "refund not credited",
      "waiting for refund",
      "delayed refund",
      "refund taking too long",
      "where is money",
    ],
    answer:
      "Refunds are approved as soon as the returned item passes quality verification. For online payments, funds credit back within **5 to 7 business days**. For COD orders, please provide your bank/UPI details in My Account.",
    isActive: true,
  },
  {
    topic: "Refund Method",
    category: "refund",
    keywords: [
      "refund method",
      "how refund is paid",
      "refund mode",
      "refund to bank",
      "refund to source",
      "original payment method refund",
    ],
    answer:
      "Online payments (UPI, Credit/Debit cards, Net Banking) are automatically refunded back to the original source account. COD payments are refunded directly to your provided Bank Account (NEFT/IMPS) or verified UPI VPA.",
    isActive: true,
  },
  {
    topic: "Refund Timeline",
    category: "refund",
    keywords: [
      "refund timeline",
      "how long does refund take",
      "refund days",
      "upi refund timeline",
      "card refund timeline",
      "cod refund time",
    ],
    answer:
      "Timeline breakdown: UPI refunds: 1-3 business days. Credit/Debit Cards: 5-7 business days. Net Banking: 3-5 business days. In-store returns provide instant store vouchers or original payment reversals.",
    isActive: true,
  },
  {
    topic: "Cancelled Order Refund",
    category: "refund",
    keywords: [
      "cancelled order refund",
      "refund for cancelled order",
      "when will cancelled order be refunded",
      "cancellation refund timeline",
    ],
    answer:
      "When you cancel an order before dispatch, our system initiates the refund instantly. The amount is returned to your original payment method within 3 to 5 business days.",
    isActive: true,
  },
  {
    topic: "Damaged Product Return",
    category: "returns",
    keywords: [
      "damaged product return",
      "return damaged item",
      "received broken item return",
      "return defective item",
    ],
    answer:
      "If your item arrived damaged or defective, initiate a return from **My Account > Orders & Returns** under 'Damaged on Delivery' within 7 days. We provide free pickup and a 100% refund or immediate replacement.",
    isActive: true,
  },
  {
    topic: "Wrong Product Return",
    category: "returns",
    keywords: [
      "wrong product return",
      "return wrong item",
      "received wrong size return",
      "incorrect product return",
    ],
    answer:
      "Select 'Wrong Item Delivered' in your return request under **My Account > Orders & Returns**. We prioritize wrong-item pickups and dispatch the correct product with zero additional shipping charges.",
    isActive: true,
  },

  // =========================================================
  // 3. PAYMENT
  // =========================================================
  {
    topic: "UPI Payment",
    category: "payment",
    keywords: [
      "upi payment",
      "google pay",
      "gpay",
      "phonepe",
      "paytm",
      "bhim upi",
      "vpa payment",
      "upi qr",
      "pay using upi",
    ],
    answer:
      "We support instant 1-click UPI payments via Google Pay (GPay), PhonePe, Paytm, BHIM, and custom UPI IDs/VPAs, secured with 256-bit encryption through Stripe.",
    isActive: true,
  },
  {
    topic: "Credit Card Payment",
    category: "payment",
    keywords: [
      "credit card payment",
      "pay with credit card",
      "visa",
      "mastercard",
      "rupay credit card",
      "card checkout",
      "amex",
    ],
    answer:
      "We accept all major Indian and International credit cards (Visa, MasterCard, RuPay, American Express, Maestro) with mandatory RBI 3D-Secure 2-factor authentication.",
    isActive: true,
  },
  {
    topic: "Debit Card Payment",
    category: "payment",
    keywords: [
      "debit card payment",
      "pay with debit card",
      "atm card payment",
      "bank card payment",
      "rupay debit card",
    ],
    answer:
      "All domestic debit cards (Visa, MasterCard, RuPay) are supported with OTP authorization for maximum fraud protection.",
    isActive: true,
  },
  {
    topic: "Cash on Delivery",
    category: "payment",
    keywords: [
      "do you have cod",
      "cash on delivery",
      "cod available",
      "pay on delivery",
      "cash payment at doorstep",
      "can i pay cash",
    ],
    answer:
      "Yes! Cash on Delivery (COD) is available on eligible pincodes across India. You can pay with cash or via UPI QR scan directly at your doorstep when the delivery partner arrives.",
    isActive: true,
  },
  {
    topic: "Payment Security",
    category: "payment",
    keywords: [
      "payment security",
      "is payment safe",
      "secure payment",
      "pci dss",
      "stripe security",
      "ssl encryption",
      "safe to pay online",
    ],
    answer:
      "All transactions are 100% secure, processed over TLS 1.3 encryption, and adhere to global PCI-DSS Level 1 compliance powered by Stripe. Decathlon never stores your card CVV or PIN.",
    isActive: true,
  },
  {
    topic: "Coupon + Payment",
    category: "payment",
    keywords: [
      "coupon payment",
      "use coupon with card",
      "discount on payment",
      "bank offer",
      "promo code during checkout",
    ],
    answer:
      "You can apply valid promo coupon codes in your Cart before heading to checkout. The discount applies immediately to your order total, and the remaining balance can be paid via UPI, Card, or COD.",
    isActive: true,
  },
  {
    topic: "Stripe Payment Error",
    category: "payment",
    keywords: [
      "stripe payment error",
      "stripe error",
      "card declined",
      "stripe test mode error",
      "3d secure failed",
      "payment intent failed",
    ],
    answer:
      "Common card errors include disabled e-commerce transactions, insufficient funds, or incorrect OTP. Enable online transactions in your banking app or try checking out with UPI or Cash on Delivery.",
    isActive: true,
  },

  // =========================================================
  // 4. ACCOUNT
  // =========================================================
  {
    topic: "Create Account",
    category: "account",
    keywords: [
      "create account",
      "sign up",
      "register",
      "new customer",
      "how to register",
      "membership signup",
      "join decathlon",
    ],
    answer:
      "Creating an account is free and takes under 30 seconds! Click **Login / Register** in the top navigation, enter your mobile number or email, and verify with the 6-digit OTP to get your digital membership card.",
    isActive: true,
  },
  {
    topic: "Login",
    category: "account",
    keywords: [
      "login",
      "sign in",
      "how to login",
      "otp login",
      "access account",
      "login with phone",
      "cannot login",
    ],
    answer:
      "Log in securely via OTP sent to your registered mobile number or email address at **/login**. No cumbersome passwords required!",
    isActive: true,
  },
  {
    topic: "Forgot Password",
    category: "account",
    keywords: [
      "forgot password",
      "cannot remember password",
      "lost password",
      "password help",
      "recover password",
    ],
    answer:
      "Decathlon accounts primarily use secure OTP authentication. If your account uses a password, click **Forgot Password** on the login page to receive a password reset link on your registered email.",
    isActive: true,
  },
  {
    topic: "Reset Password",
    category: "account",
    keywords: [
      "reset password",
      "change password",
      "update password",
      "new password",
    ],
    answer:
      "To update your password, navigate to **My Account > Profile Settings** (/account). Under Security, enter your current password followed by your new password.",
    isActive: true,
  },
  {
    topic: "Change Phone Number",
    category: "account",
    keywords: [
      "change phone number",
      "update mobile number",
      "new phone number",
      "edit contact number",
    ],
    answer:
      "To change your registered mobile number, visit **My Account > Profile** (/account), enter your new mobile number, and verify with the SMS OTP.",
    isActive: true,
  },
  {
    topic: "Change Email",
    category: "account",
    keywords: [
      "change email",
      "update email address",
      "new email",
      "edit email",
    ],
    answer:
      "Update your communication email in **My Account > Profile** (/account). Order confirmations and tax invoices will be sent to your updated email address.",
    isActive: true,
  },
  {
    topic: "Update Profile",
    category: "account",
    keywords: [
      "update profile",
      "edit profile",
      "change name",
      "my account profile",
      "profile settings",
      "sports preferences",
    ],
    answer:
      "Manage your name, preferred sports, communication preferences, and emergency contacts in **My Account > Profile** (/account).",
    isActive: true,
  },
  {
    topic: "Address Management",
    category: "account",
    keywords: [
      "address management",
      "add address",
      "saved addresses",
      "delete address",
      "change default address",
      "my addresses",
    ],
    answer:
      "You can add, edit, or remove delivery addresses under **My Account > Addresses**. Set a default shipping address for faster 1-click checkout.",
    isActive: true,
  },
  {
    topic: "Delete Account",
    category: "account",
    keywords: [
      "delete account",
      "close account",
      "remove my data",
      "deactivate account",
      "delete decathlon profile",
    ],
    answer:
      "In compliance with digital privacy laws, you can request account deletion under **My Account > Profile > Privacy & Data**. Please note that deletion removes your paperless warranty receipt history.",
    isActive: true,
  },
  {
    topic: "Logout",
    category: "account",
    keywords: [
      "logout",
      "sign out",
      "log off",
      "how to logout",
    ],
    answer:
      "To log out, click your profile icon in the top header and select **Logout**. You can log back in anytime with your mobile OTP.",
    isActive: true,
  },

  // =========================================================
  // 5. PRODUCTS
  // =========================================================
  {
    topic: "Product Availability",
    category: "products",
    keywords: [
      "product availability",
      "is product in stock",
      "check availability",
      "available in stock",
      "can i buy this",
      "stock status",
    ],
    answer:
      "Product availability is shown in real time on every product card and product page. If an item is in stock, you can order online or opt for 2-hour Click & Collect in stores.",
    isActive: true,
  },
  {
    topic: "Product Out of Stock",
    category: "products",
    keywords: [
      "product out of stock",
      "sold out",
      "item out of stock",
      "currently unavailable",
      "stock finished",
    ],
    answer:
      "If a product or specific size is sold out, click the **Notify Me When Available** button on the product page to receive an alert as soon as our warehouse restocks.",
    isActive: true,
  },
  {
    topic: "Product Restock",
    category: "products",
    keywords: [
      "product restock",
      "when will product restock",
      "notify when available",
      "restock date",
      "stock alert",
    ],
    answer:
      "Most core sports gear is restocked every 2 to 3 weeks. Seasonal apparel and limited edition gear restock according to the sports calendar.",
    isActive: true,
  },
  {
    topic: "Product Details",
    category: "products",
    keywords: [
      "product details",
      "specifications",
      "materials",
      "fabric composition",
      "weight",
      "product features",
      "dimensions",
    ],
    answer:
      "Each product page includes technical specifications, eco-design ratings, material compositions, weight, dimensions, and user manuals tested by Decathlon sports engineers.",
    isActive: true,
  },
  {
    topic: "Product Price",
    category: "products",
    keywords: [
      "product price",
      "mrp",
      "discount price",
      "price inquiry",
      "cost of product",
      "best price",
    ],
    answer:
      "All prices shown on our website include applicable GST. We are committed to making sport accessible with everyday fair pricing and genuine discounts.",
    isActive: true,
  },
  {
    topic: "Product Images",
    category: "products",
    keywords: [
      "product images",
      "photos",
      "see more pictures",
      "product video",
      "high resolution images",
    ],
    answer:
      "Browse high-resolution 360-degree product photography, model fit images, and real in-action sports videos on each product display page.",
    isActive: true,
  },
  {
    topic: "Product Reviews",
    category: "products",
    keywords: [
      "product reviews",
      "customer ratings",
      "user reviews",
      "product feedback",
      "star rating",
      "is it good quality",
    ],
    answer:
      "All product reviews are from verified purchasers. You can filter reviews by rating, sport frequency, and user size to see real-world performance feedback.",
    isActive: true,
  },
  {
    topic: "Product Comparison",
    category: "products",
    keywords: [
      "product comparison",
      "compare products",
      "which is better",
      "difference between models",
      "model comparison",
    ],
    answer:
      "Ask our AI Assistant in chat (e.g. 'Compare Rockrider ST100 vs ST120') to get a side-by-side breakdown of technical specs, weight, gearing, and prices!",
    isActive: true,
  },
  {
    topic: "Product Recommendation",
    category: "products",
    keywords: [
      "product recommendation",
      "suggest gear",
      "recommend product",
      "what should i buy",
      "gift suggestion",
    ],
    answer:
      "Tell our AI Assistant your sport, skill level, and budget (e.g. 'Recommend trekking shoes under ₹3000'), and it will instantly pull top-rated gear tailored for you!",
    isActive: true,
  },
  {
    topic: "Best Product for Beginners",
    category: "products",
    keywords: [
      "best product for beginners",
      "starter gear",
      "beginner recommendations",
      "first time buying",
      "entry level product",
    ],
    answer:
      "Decathlon's '100' series products (e.g., Triban RC100, Kiprun Run 100, Perfly BR 100) are engineered specifically for beginners, offering high durability and forgiving ergonomics at accessible prices.",
    isActive: true,
  },

  // =========================================================
  // 6. SHOPPING
  // =========================================================
  {
    topic: "Add to Cart",
    category: "cart",
    keywords: [
      "add to cart",
      "how to add item to cart",
      "put in basket",
      "buy item",
      "add product",
    ],
    answer:
      "Select your required size and color on any product page and click **Add to Cart**. Your selected items will be saved in your shopping bag across all devices.",
    isActive: true,
  },
  {
    topic: "Remove From Cart",
    category: "cart",
    keywords: [
      "remove from cart",
      "delete cart item",
      "clear cart",
      "remove product from bag",
    ],
    answer:
      "To remove an item, open your Cart (/cart) and click the **Delete / Trash** icon next to the product.",
    isActive: true,
  },
  {
    topic: "Update Cart Quantity",
    category: "cart",
    keywords: [
      "update cart quantity",
      "change quantity",
      "increase item count",
      "decrease quantity in cart",
    ],
    answer:
      "In your Cart (/cart), use the **+** or **-** buttons to modify the quantity of any item. Your total amount and discounts will recalculate automatically.",
    isActive: true,
  },
  {
    topic: "Wishlist",
    category: "wishlist",
    keywords: [
      "wishlist",
      "save for later",
      "favorites",
      "add to wishlist",
      "view wishlist",
      "heart icon",
    ],
    answer:
      "Tap the **Heart icon** on any product card to save items to your personal Wishlist (/wishlist) to track price drops and restocks.",
    isActive: true,
  },
  {
    topic: "Move Wishlist Item to Cart",
    category: "wishlist",
    keywords: [
      "move wishlist item to cart",
      "buy wishlist product",
      "transfer to cart from wishlist",
    ],
    answer:
      "Open your Wishlist (/wishlist) and click **Move to Cart** next to any saved item to proceed with checkout.",
    isActive: true,
  },
  {
    topic: "Apply Coupon",
    category: "coupons",
    keywords: [
      "apply coupon",
      "how to use promo code",
      "enter discount code",
      "redeem voucher",
      "apply promo",
    ],
    answer:
      "In your Cart or during Checkout, find the **Have a Coupon / Promo Code?** box, enter your coupon code, and click **Apply** to deduct the discount immediately.",
    isActive: true,
  },
  {
    topic: "Coupon Not Working",
    category: "coupons",
    keywords: [
      "coupon not working",
      "promo code invalid",
      "discount code expired",
      "coupon error",
      "why coupon failed",
    ],
    answer:
      "Check the coupon terms: minimum order value, valid categories, expiry date, and one-time use per user. Coupons do not apply to clearance items or gift cards.",
    isActive: true,
  },
  {
    topic: "Discount Offers",
    category: "offers",
    keywords: [
      "discount offers",
      "current sales",
      "end of season sale",
      "best deals",
      "clearance discounts",
      "special offers",
    ],
    answer:
      "Explore ongoing promotions on our **Deals & Clearance** page to enjoy discounts up to 60% on end-of-season sports apparel, shoes, and equipment.",
    isActive: true,
  },
  {
    topic: "Product Search",
    category: "products",
    keywords: [
      "product search",
      "how to search",
      "find sports gear",
      "filter products",
      "search catalog",
    ],
    answer:
      "Use the search bar at the top of the store, filter by sport, gender, brand, price, and customer rating, or simply ask our AI Assistant in chat!",
    isActive: true,
  },
  {
    topic: "Category Search",
    category: "products",
    keywords: [
      "category search",
      "sports categories",
      "browse sports",
      "shop by sport",
      "all collections",
    ],
    answer:
      "Hover over the **Sports Categories** menu in the header to browse gear for over 70 sports: Running, Cycling, Hiking, Fitness, Water Sports, Team Sports, and more.",
    isActive: true,
  },

  // =========================================================
  // 7. SIZING
  // =========================================================
  {
    topic: "Clothing Size",
    category: "sizing",
    keywords: [
      "clothing size",
      "apparel sizing",
      "tshirt size",
      "jacket size",
      "trackpant size",
      "chest measurement",
    ],
    answer:
      "Decathlon clothing follows standard athletic cuts: XS (34\"), S (36\"), M (38\"), L (40\"), XL (42\"), 2XL (44\"). For relaxed fit or layering winter jackets, we recommend sizing up one size.",
    isActive: true,
  },
  {
    topic: "Shoe Size",
    category: "sizing",
    keywords: [
      "shoe size",
      "footwear sizing",
      "uk size",
      "eu size",
      "foot length in cm",
      "shoe size chart",
    ],
    answer:
      "All footwear displays both UK and EU sizing. We advise measuring your foot length from heel to toe in centimeters and referring to the size chart on the product page. For running and hiking shoes, choose 0.5 to 1 size larger for toe comfort.",
    isActive: true,
  },
  {
    topic: "Bike Size",
    category: "sizing",
    keywords: [
      "bike size",
      "bicycle frame size",
      "what cycle size for my height",
      "mtb size chart",
      "cycle height guide",
    ],
    answer:
      "Bicycle sizing by rider height: S (150-164 cm), M (165-174 cm), L (175-184 cm), XL (185-200 cm). If you fall between two sizes, choose the smaller size for agile handling or the larger size for touring comfort.",
    isActive: true,
  },
  {
    topic: "Helmet Size",
    category: "sizing",
    keywords: [
      "helmet size",
      "head circumference",
      "cycling helmet size",
      "skating helmet size",
      "kids helmet",
    ],
    answer:
      "Measure your head circumference right above your eyebrows: S (52-55 cm), M (55-59 cm), L (59-62 cm). Decathlon helmets feature micro-adjustable dial wheels for a snug, secure fit.",
    isActive: true,
  },
  {
    topic: "Gloves Size",
    category: "sizing",
    keywords: [
      "gloves size",
      "hand measurement",
      "gym gloves size",
      "winter gloves size",
      "boxing gloves oz",
    ],
    answer:
      "Measure palm circumference excluding the thumb: S (19-20 cm), M (20-21.5 cm), L (21.5-23 cm), XL (23-24.5 cm). Boxing gloves use ounce ratings: 10oz (sparring/bag), 12oz-14oz (general training).",
    isActive: true,
  },
  {
    topic: "Size Guide",
    category: "sizing",
    keywords: [
      "size guide",
      "sizing chart",
      "how to measure",
      "find my size",
      "fitting guide",
    ],
    answer:
      "Click the **Size Guide** link on any product page right above the size selector for detailed chest, waist, hip, and foot length measurements in centimeters and inches.",
    isActive: true,
  },
  {
    topic: "Wrong Size Received",
    category: "sizing",
    keywords: [
      "wrong size received",
      "received wrong size shoes",
      "too tight",
      "too loose",
      "size does not fit",
    ],
    answer:
      "If the size delivered does not match your order, or doesn't fit comfortably, initiate an exchange under **My Account > Orders & Returns** or walk into your nearest Decathlon store for an instant swap.",
    isActive: true,
  },
  {
    topic: "Size Exchange",
    category: "sizing",
    keywords: [
      "size exchange",
      "exchange for larger size",
      "exchange for smaller size",
      "swap size online",
    ],
    answer:
      "Free size exchanges are available within 30 days! Select your preferred new size in **My Account > Orders & Returns**, and our courier will deliver the new size while picking up the original item.",
    isActive: true,
  },

  // =========================================================
  // 8. DELIVERY
  // =========================================================
  {
    topic: "Shipping Charges",
    category: "delivery",
    keywords: [
      "shipping charges",
      "delivery fee",
      "convenience fee",
      "shipping cost",
      "delivery rates",
    ],
    answer:
      "Standard delivery fee is ₹99 for orders under ₹1,499. Orders of ₹1,499 and above qualify for **100% Free Home Delivery**.",
    isActive: true,
  },
  {
    topic: "Free Delivery",
    category: "delivery",
    keywords: [
      "free delivery",
      "how to get free shipping",
      "minimum order for free delivery",
      "zero shipping cost",
    ],
    answer:
      "Enjoy **Free Standard Home Delivery** on all cart orders of **₹1,499 or more**. Click & Collect store pickup is always 100% free with no minimum cart value.",
    isActive: true,
  },
  {
    topic: "Delivery Time",
    category: "delivery",
    keywords: [
      "delivery time",
      "how many days for delivery",
      "standard shipping duration",
      "when will it reach",
    ],
    answer:
      "Standard delivery takes **2 to 5 business days** depending on your location. Metro cities generally receive delivery within 48 to 72 hours.",
    isActive: true,
  },
  {
    topic: "Same Day Delivery",
    category: "delivery",
    keywords: [
      "same day delivery",
      "deliver today",
      "instant delivery",
      "urgent delivery",
    ],
    answer:
      "Same-day delivery is available for orders placed before 11:00 AM on eligible pin codes in select metro cities (Bengaluru, Mumbai, Delhi-NCR, Hyderabad).",
    isActive: true,
  },
  {
    topic: "Express Delivery",
    category: "delivery",
    keywords: [
      "express delivery",
      "fast shipping",
      "next day delivery",
      "priority shipping",
    ],
    answer:
      "Express Next-Day delivery is available during checkout for eligible metro pincodes with priority air cargo routing.",
    isActive: true,
  },
  {
    topic: "Delivery PIN Code",
    category: "delivery",
    keywords: [
      "delivery pin code",
      "check pincode serviceability",
      "do you deliver to my pincode",
      "serviceable area",
    ],
    answer:
      "Enter your 6-digit postal PIN code on any product page or in your Cart to check real-time courier serviceability, delivery dates, and COD availability.",
    isActive: true,
  },
  {
    topic: "Delivery Tracking",
    category: "delivery",
    keywords: [
      "delivery tracking",
      "live courier tracking",
      "bluedart tracking",
      "delhivery tracking",
      "awb number",
    ],
    answer:
      "As soon as your package is dispatched, we send you an SMS and email with your AWB tracking number and a direct live link to courier tracking (BlueDart, Delhivery, Shadowfax).",
    isActive: true,
  },
  {
    topic: "Store Pickup",
    category: "pickup",
    keywords: [
      "store pickup",
      "collect from store",
      "self pickup",
      "pickup point",
      "collect order in person",
    ],
    answer:
      "Opt for Store Pickup during checkout to collect your items for free from your selected Decathlon store. Show your order confirmation SMS or barcode at the Welcome Desk.",
    isActive: true,
  },
  {
    topic: "Click & Collect",
    category: "pickup",
    keywords: [
      "where can i pick up my order",
      "click & collect",
      "click and collect",
      "2 hour store pickup",
      "reserve in store",
    ],
    answer:
      "With **Click & Collect**, order online and collect from your nearest Decathlon store in as little as **2 hours**! It's 100% free with no minimum cart value.",
    isActive: true,
  },

  // =========================================================
  // 9. STORE
  // =========================================================
  {
    topic: "Store Location",
    category: "store",
    keywords: [
      "store location",
      "nearest decathlon store",
      "decathlon store near me",
      "locate store",
      "store address",
    ],
    answer:
      "Decathlon has 100+ stores across 45+ cities in India. Find your nearest store, directions, and contact information on our Store Locator page or ask our AI chatbot with your city name!",
    isActive: true,
  },
  {
    topic: "Store Timings",
    category: "store",
    keywords: [
      "store timings",
      "opening hours",
      "closing time",
      "is decathlon open today",
      "working hours",
      "sunday timings",
    ],
    answer:
      "Most Decathlon stores in India are open **7 days a week from 10:00 AM to 9:30 PM**, including weekends and national holidays.",
    isActive: true,
  },
  {
    topic: "Store Availability",
    category: "store",
    keywords: [
      "store availability",
      "which stores are open",
      "store open on sunday",
      "store holidays",
    ],
    answer:
      "Our physical stores remain open on Sundays and most public holidays so you can test sports gear and enjoy community sports zones.",
    isActive: true,
  },
  {
    topic: "Product Available in Store",
    category: "store",
    keywords: [
      "product available in store",
      "is item available in nearest store",
      "check store stock",
      "in-store inventory",
    ],
    answer:
      "On each product page, click **Check In-Store Stock** and choose your preferred city to see real-time shelf inventory at each local store.",
    isActive: true,
  },
  {
    topic: "Workshop Services",
    category: "store",
    keywords: [
      "workshop services",
      "in store workshop",
      "sports equipment repair",
      "restringing service",
      "equipment maintenance",
    ],
    answer:
      "Every Decathlon store has a dedicated sports workshop offering bicycle tune-ups, tennis/badminton racket restringing, skate/scooter repairs, and fitness machine servicing.",
    isActive: true,
  },
  {
    topic: "Bicycle Service",
    category: "store",
    keywords: [
      "bicycle service",
      "cycle repair",
      "free cycle tune up",
      "gear adjustment",
      "cycle puncture fix",
      "brake replacement",
    ],
    answer:
      "Bicycles bought at Decathlon include a **FREE safety tune-up within the first 3 months**! In-store technicians can adjust gears, bleed brakes, true wheels, and fix punctures on the spot.",
    isActive: true,
  },
  {
    topic: "Contact Customer Support",
    category: "general",
    keywords: [
      "contact customer support",
      "helpline number",
      "customer care email",
      "support phone",
      "how to reach decathlon",
      "talk to executive",
    ],
    answer:
      "Reach our customer care team via Helpline: **1800-425-1877** (Mon-Sun 9:00 AM - 8:00 PM IST) or email us at **care.india@decathlon.com**. You can also submit an official support ticket right here in this chat!",
    isActive: true,
  },

  // =========================================================
  // 10. SPORTS ADVICE
  // =========================================================
  {
    topic: "Running Shoes",
    category: "sports_advice",
    keywords: [
      "what size running shoes should i buy",
      "running shoes",
      "best running shoes",
      "marathon shoes",
      "cushioned running shoes",
      "kalenji",
      "kiprun",
    ],
    answer:
      "For 5K-10K jogging, choose **Kalenji Run Cushion** (lightweight EVA sole). For half/full marathons, choose **Kiprun KD500 or KS900** with high-rebound Kalensole cushioning. *Tip:* Pick 1 size larger than your casual shoe for optimal toe space during long runs.",
    isActive: true,
  },
  {
    topic: "Football Shoes",
    category: "sports_advice",
    keywords: [
      "football shoes",
      "studs",
      "turf shoes",
      "cleats",
      "kipsta",
      "firm ground studs",
      "futsal shoes",
    ],
    answer:
      "Match your footwear to the surface: **Kipsta Agility 100/140 FG** with round studs for natural grass, **TF (Turf) shoes** with rubber multi-lugs for synthetic turf, and flat non-marking soles for indoor futsal courts.",
    isActive: true,
  },
  {
    topic: "Cricket Equipment",
    category: "sports_advice",
    keywords: [
      "cricket equipment",
      "cricket bat",
      "english willow",
      "kashmir willow",
      "cricket balls",
      "flx",
      "batting pads",
    ],
    answer:
      "Our **FLX Cricket** line offers Kashmir Willow bats for leather/tennis ball club matches and Grade 1/2 English Willow bats for competitive tournaments, along with ultralight batting pads, gloves, and helmets.",
    isActive: true,
  },
  {
    topic: "Badminton Racket",
    category: "sports_advice",
    keywords: [
      "badminton racket",
      "badminton racquet",
      "perfly",
      "best badminton racket",
      "feather shuttles",
      "nylon shuttles",
    ],
    answer:
      "Beginners: **Perfly BR 100/160** (isometric aluminium frame with a wide sweet spot). Intermediate: **Perfly BR 560** (graphite shaft, even balance). Advanced: **Perfly BR 990** (82g high-modulus graphite, head-heavy for smash power).",
    isActive: true,
  },
  {
    topic: "Tennis Racket",
    category: "sports_advice",
    keywords: [
      "tennis racket",
      "artengo",
      "tennis balls",
      "tennis racquet for beginners",
      "tennis grip size",
    ],
    answer:
      "Explore **Artengo TR 100/160** for recreational play (larger 660cm² head for forgiving strokes), or **Artengo TR 900/990** (300g graphite, 16x19 string pattern) for tournament precision and heavy spin.",
    isActive: true,
  },
  {
    topic: "Basketball",
    category: "sports_advice",
    keywords: [
      "basketball",
      "tarmak",
      "basketball size 7",
      "basketball size 5",
      "indoor outdoor basketball",
      "basketball hoop",
    ],
    answer:
      "Our **Tarmak BT500** basketball features deep-groove polyurethane composite leather for exceptional grip on both indoor hardwood and outdoor concrete courts. Size 7 (Men 13+), Size 6 (Women/Teens), Size 5 (Kids 7-12).",
    isActive: true,
  },
  {
    topic: "Cycling",
    category: "sports_advice",
    keywords: [
      "cycling",
      "road bike",
      "commuter bicycle",
      "triban",
      "btwin",
      "cycle helmet",
      "cycling shorts with pad",
    ],
    answer:
      "For daily city commutes and fast paved roads, choose **Triban RC100 / Flat Bar**. Pair with padded bib shorts, a certified BTWIN helmet, and rechargeable front & rear USB LED safety lights.",
    isActive: true,
  },
  {
    topic: "Mountain Biking",
    category: "sports_advice",
    keywords: [
      "mountain biking",
      "mtb",
      "rockrider",
      "front suspension bike",
      "trail riding",
      "hydraulic disc brakes",
    ],
    answer:
      "Tackle trails and rough terrain with the **Rockrider EXPL 100 or ST 540**, equipped with 100mm hydraulic front suspension, 27.5\" or 29\" puncture-resistant tires, and responsive disc brakes.",
    isActive: true,
  },
  {
    topic: "Hiking",
    category: "sports_advice",
    keywords: [
      "hiking",
      "hiking shoes",
      "day hike gear",
      "quechua",
      "trekking poles",
      "hiking backpack 20l",
    ],
    answer:
      "For day hikes, pack a **Quechua NH100 20L backpack**, sturdy **MH100 hiking shoes** with CrossContact rubber grip, aluminum hiking poles, and quick-dry UV-protective apparel.",
    isActive: true,
  },
  {
    topic: "Trekking",
    category: "sports_advice",
    keywords: [
      "trekking",
      "himalayan trek",
      "forclaz",
      "waterproof trekking boots",
      "trekking backpack 50l",
      "down jacket",
      "thermals",
    ],
    answer:
      "For high-altitude Himalayan treks, gear up with **Forclaz Trek 500 waterproof boots**, a 50L-70L ergonomic rucksack, a -5°C to -10°C compact down jacket, merino wool base layers, and waterproof rain ponchos.",
    isActive: true,
  },
  {
    topic: "Camping",
    category: "sports_advice",
    keywords: [
      "camping",
      "camping tent",
      "quechua 2 seconds tent",
      "sleeping bag",
      "inflatable mattress",
      "camping stove",
    ],
    answer:
      "Camp comfortably with **Quechua 2 Seconds Fresh & Black pop-up tents** (blocks 99% light and reduces heat), compact sleeping bags rated for your destination's temperature, self-inflating sleeping pads, and rechargeable camp lanterns.",
    isActive: true,
  },
  {
    topic: "Gym Equipment",
    category: "sports_advice",
    keywords: [
      "gym equipment",
      "home gym",
      "dumbbells",
      "domyos",
      "kettlebells",
      "weight bench",
      "pull up bar",
    ],
    answer:
      "Set up an effective home workout space with **Domyos rubber hex dumbbells (2.5kg to 20kg)**, color-coded resistance bands, adjustable door-frame pull-up bars, and high-density floor protection mats.",
    isActive: true,
  },
  {
    topic: "Yoga Equipment",
    category: "sports_advice",
    keywords: [
      "yoga equipment",
      "yoga mat",
      "yoga block",
      "non slip mat 8mm",
      "kimjaly",
      "yoga strap",
      "meditation cushion",
    ],
    answer:
      "Our **Kimjaly eco-friendly 8mm yoga mats** feature textured non-slip grip and extra joint cushioning. Pair with high-density EVA foam yoga blocks and cotton alignment straps for deep stretching.",
    isActive: true,
  },
  {
    topic: "Swimming Equipment",
    category: "sports_advice",
    keywords: [
      "swimming equipment",
      "goggles",
      "swimsuit",
      "nabaiji",
      "microfiber towel",
      "swimming cap",
      "kickboard",
    ],
    answer:
      "Glide through the water with **Nabaiji panoramic anti-fog goggles**, chlorine-resistant swimsuits, silicone hydrodynamic caps, kickboards, and ultra-absorbent microfiber travel towels.",
    isActive: true,
  },
  {
    topic: "Boxing Equipment",
    category: "sports_advice",
    keywords: [
      "boxing equipment",
      "boxing gloves",
      "outshock",
      "punching bag",
      "hand wraps",
      "mouthguard",
    ],
    answer:
      "Train safely with **Outshock 120/500 ergonomic boxing gloves** (triple-density foam protection), 4m breathable cotton hand wraps, thermoformable mouthguards, and heavy-duty freestanding punching bags.",
    isActive: true,
  },
  {
    topic: "Skating Equipment",
    category: "sports_advice",
    keywords: [
      "skating equipment",
      "inline skates",
      "roller skates",
      "oxelo",
      "skateboard",
      "skate helmet",
      "protective pads",
    ],
    answer:
      "Glide smoothly with **Oxelo Fit 100/500 inline skates** equipped with 80mm/84mm 84A polyurethane wheels and ABEC 5/7 bearings. Always gear up with our 3-piece wrist, elbow, and knee pad set plus a certified skate helmet.",
    isActive: true,
  },
  {
    topic: "Golf Equipment",
    category: "sports_advice",
    keywords: [
      "golf equipment",
      "golf clubs",
      "inesis",
      "golf balls",
      "golf kit for beginners",
      "golf glove",
    ],
    answer:
      "Lower your handicap with **Inesis 100/500 golf sets** (ultra-forgiving oversized club faces for beginners and intermediates), Distance 100 two-piece golf balls, stand bags with dual backpack straps, and cabretta leather golf gloves.",
    isActive: true,
  },
  {
    topic: "Winter Sports",
    category: "sports_advice",
    keywords: [
      "winter sports",
      "ski jacket",
      "wedze",
      "snow boots",
      "fleece liner",
      "thermal inners",
      "snowboarding",
    ],
    answer:
      "Stay warm down to -15°C with **Wed'ze waterproof ski jackets**, warm snow boots with snow-contact grip soles, breathable thermal base layers, and polarized ski goggles.",
    isActive: true,
  },
  {
    topic: "Water Sports",
    category: "sports_advice",
    keywords: [
      "water sports",
      "kayak",
      "inflatable kayak",
      "itiwit",
      "stand up paddle board",
      "snorkeling mask",
      "life jacket",
      "subea easybreath",
    ],
    answer:
      "Experience the water with **Itiwit inflatable touring kayaks**, 10' Stand-Up Paddle boards (SUP), ISO 50N certified buoyancy life vests, and the innovative **Subea Easybreath panoramic full-face snorkeling mask**.",
    isActive: true,
  },
  // =========================================================
  // 13. CLOTHING, APPAREL & SPORTSWEAR
  // =========================================================
  {
    topic: "Men's T-Shirts",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "tshirt",
      "t-shirt",
      "t shirts",
      "tee",
      "tees",
      "men clothing",
      "mens clothing",
      "men apparel",
    ],
    answer:
      "We can help you find men's T-shirts. You can browse available men's T-shirts and filter by size, color, price and other available options.",
    isActive: true,
  },
  {
    topic: "Women's T-Shirts",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "female",
      "tshirt",
      "t-shirt",
      "t shirts",
      "tee",
      "tees",
      "women clothing",
      "womens clothing",
      "women apparel",
      "top",
      "tops",
    ],
    answer:
      "We offer a wide collection of women's T-shirts and tops designed for running, fitness, trekking, and casual wear. You can filter by fit, color, size, and price.",
    isActive: true,
  },
  {
    topic: "Men's Shirts",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "shirt",
      "shirts",
      "polo",
      "polos",
      "men polo",
      "men shirt",
      "men clothing",
    ],
    answer:
      "Explore men's sports shirts, hiking shirts, and technical polos made from breathable, quick-dry fabric. Browse options to filter by style, size, and price.",
    isActive: true,
  },
  {
    topic: "Women's Shirts",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "shirt",
      "shirts",
      "polo",
      "polos",
      "women polo",
      "women shirt",
      "women clothing",
    ],
    answer:
      "Discover women's technical hiking shirts, sports polos, and breathable outdoor tops crafted for UV protection, moisture management, and comfort.",
    isActive: true,
  },
  {
    topic: "Men's Shorts",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "shorts",
      "short",
      "gym shorts",
      "running shorts",
      "cargo shorts",
      "men shorts",
      "bermuda",
    ],
    answer:
      "Check out our range of men's sports shorts, including 2-in-1 running shorts, gym training shorts, and lightweight trekking bermudas.",
    isActive: true,
  },
  {
    topic: "Women's Shorts",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "shorts",
      "short",
      "gym shorts",
      "cycling shorts",
      "women shorts",
      "running shorts",
    ],
    answer:
      "Browse our selection of women's fitness shorts, running shorts with inner tights, and padded cycling shorts tailored for comfort and flexibility.",
    isActive: true,
  },
  {
    topic: "Men's Jackets",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "jacket",
      "jackets",
      "windcheater",
      "rain jacket",
      "down jacket",
      "fleece jacket",
      "men jacket",
    ],
    answer:
      "Explore men's jackets including waterproof raincoats, lightweight windcheaters, winter down jackets, and warm fleece layers for hiking and sports.",
    isActive: true,
  },
  {
    topic: "Women's Jackets",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "jacket",
      "jackets",
      "windcheater",
      "rain jacket",
      "down jacket",
      "fleece jacket",
      "women jacket",
    ],
    answer:
      "Discover women's waterproof hiking jackets, windbreakers, thermal down jackets, and stylish sports jackets designed for all weather conditions.",
    isActive: true,
  },
  {
    topic: "Men's Track Pants",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "track pant",
      "track pants",
      "trackpants",
      "joggers",
      "jogger",
      "sweatpants",
      "men track pants",
    ],
    answer:
      "Find men's track pants and joggers engineered for gym workouts, running, and lounging with stretchable, breathable fabrics and secure zippered pockets.",
    isActive: true,
  },
  {
    topic: "Women's Track Pants",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "track pant",
      "track pants",
      "trackpants",
      "joggers",
      "jogger",
      "sweatpants",
      "yoga pants",
      "leggings",
      "tights",
      "women track pants",
    ],
    answer:
      "Explore women's track pants, yoga pants, stretch leggings, and athletic joggers crafted for maximum mobility, comfort, and moisture control.",
    isActive: true,
  },
  {
    topic: "Men's Sportswear",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "sportswear",
      "sports wear",
      "athletic wear",
      "activewear",
      "men activewear",
      "men clothing",
      "men apparel",
    ],
    answer:
      "Discover our comprehensive men's activewear and sportswear range across 70+ sports including running, gym training, football, and outdoor trekking.",
    isActive: true,
  },
  {
    topic: "Women's Sportswear",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "sportswear",
      "sports wear",
      "athletic wear",
      "activewear",
      "women activewear",
      "women clothing",
      "women apparel",
    ],
    answer:
      "Browse women's activewear featuring high-performance sports bras, breathable tops, supportive leggings, and weather-ready outdoor gear.",
    isActive: true,
  },
  {
    topic: "Kids Clothing",
    category: "products",
    keywords: [
      "kids",
      "kid",
      "children",
      "child",
      "junior",
      "boys",
      "girls",
      "kids clothing",
      "kids apparel",
      "kids t-shirt",
      "kids shorts",
      "kids trackpants",
    ],
    answer:
      "Explore our durable and comfortable kids' sportswear collection, including t-shirts, shorts, tracksuits, swimwear, and warm winter jackets.",
    isActive: true,
  },
  {
    topic: "Men's Gym Wear",
    category: "products",
    keywords: [
      "men",
      "mens",
      "men's",
      "gym wear",
      "gym clothing",
      "workout clothes",
      "fitness wear",
      "training wear",
      "men gym wear",
      "stringer",
      "gym vest",
    ],
    answer:
      "Get high-performance men's gym wear, from quick-dry stringers and training tees to stretchable workout shorts and squat-proof joggers.",
    isActive: true,
  },
  {
    topic: "Women's Gym Wear",
    category: "products",
    keywords: [
      "women",
      "womens",
      "women's",
      "gym wear",
      "gym clothing",
      "workout clothes",
      "fitness wear",
      "women gym wear",
      "sports bra",
      "gym tights",
    ],
    answer:
      "Elevate your workout with women's gym wear including high-impact sports bras, seamless workout leggings, breathable tank tops, and jackets.",
    isActive: true,
  },
];

export async function seedAiKnowledge() {
  try {
    for (const item of initialKnowledge) {
      const exists = await AiKnowledge.findOne({ topic: item.topic });
      if (!exists) {
        await AiKnowledge.create(item);
        console.log(`✓ Seeded AI knowledge: "${item.topic}"`);
      } else {
        // Update to make sure latest keywords and answers are saved
        await AiKnowledge.updateOne(
          { topic: item.topic },
          {
            $set: {
              category: item.category,
              keywords: item.keywords,
              answer: item.answer,
              isActive: item.isActive !== false,
            },
          }
        );
      }
    }
    const count = await AiKnowledge.countDocuments();
    console.log(`Total AI knowledge documents in database: ${count}`);
  } catch (err) {
    console.error("Seed AI Knowledge Error:", err);
  }
}

// Run directly if called as a script
if (process.argv[1]?.endsWith("seedAiKnowledge.js")) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("Connected to MongoDB for AI Knowledge seeding...");
      await seedAiKnowledge();
      await mongoose.disconnect();
      console.log("Seeding complete and disconnected.");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
