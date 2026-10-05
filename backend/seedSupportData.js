import mongoose from "mongoose";
import SupportCategory from "./models/SupportCategory.js";
import SupportFAQ from "./models/SupportFAQ.js";

// Seed dataset matching the 12 categories and realistic FAQs from Step 4 & 5
export const initialSupportData = [
  {
    name: "Orders",
    description: "Get help with your online orders and order status.",
    icon: "orders",
    displayOrder: 1,
    faqs: [
      {
        question: "How can I check my order status?",
        answer: "You can track your order status in real time by navigating to My Account > Orders & Returns, or by using the tracking link sent to your registered email and SMS.",
        displayOrder: 1,
      },
      {
        question: "Can I cancel my order?",
        answer: "Yes, you can cancel an eligible order directly from the order details page before it has been dispatched from our fulfillment center.",
        displayOrder: 2,
      },
      {
        question: "Where can I download tax invoices for my purchases?",
        answer: "Tax invoices are available for download in the My Orders section once an order is confirmed. A copy is also emailed to your registered address.",
        displayOrder: 3,
      },
      {
        question: "Why was my order cancelled automatically?",
        answer: "Orders are rarely cancelled, usually due to sudden unexpected inventory shortages or payment authorization timeouts. Any deducted amount is refunded immediately.",
        displayOrder: 4,
      },
      {
        question: "Can I add more products to an already placed order?",
        answer: "Once an order is confirmed, additional items cannot be added to the same shipment. Please place a new order for any additional items.",
        displayOrder: 5,
      },
    ],
  },
  {
    name: "Payments",
    description: "Payment methods, failed payments, refunds, and invoice queries.",
    icon: "payments",
    displayOrder: 2,
    faqs: [
      {
        question: "What payment methods are supported on Decathlon?",
        answer: "We support UPI (Google Pay, PhonePe, Paytm), Credit and Debit cards (Visa, Mastercard, RuPay, Amex), Net Banking, Decathlon Gift Cards, and EMI on eligible cards.",
        displayOrder: 1,
      },
      {
        question: "My payment failed but money was deducted from my bank. What to do?",
        answer: "In rare cases of bank gateway timeouts, deducted funds are automatically reversed by your bank within 24 to 48 banking hours.",
        displayOrder: 2,
      },
      {
        question: "How do I redeem my Decathlon Gift Card or voucher?",
        answer: "On the Payment page, select 'Gift Card / Voucher', enter your 16-digit card number along with the 4-digit PIN, and click Apply.",
        displayOrder: 3,
      },
      {
        question: "When will I receive my refund for a returned or cancelled order?",
        answer: "Refunds for UPI and cards are processed within 3 to 5 business days after pickup inspection. Decathlon wallet and gift card refunds are instantaneous.",
        displayOrder: 4,
      },
      {
        question: "Is No-Cost EMI available for high-value sporting equipment?",
        answer: "Yes, No-Cost EMI is available on eligible bank credit cards for purchases over ₹3,000. Available tenures are displayed on checkout.",
        displayOrder: 5,
      },
    ],
  },
  {
    name: "Delivery",
    description: "Delivery tracking, expected timelines, shipping charges, and delays.",
    icon: "delivery",
    displayOrder: 3,
    faqs: [
      {
        question: "What are the standard delivery timelines for my pincode?",
        answer: "Standard delivery typically takes 2 to 4 business days for metro cities and 4 to 7 business days for non-metro locations across India.",
        displayOrder: 1,
      },
      {
        question: "What should I do if my shipment is delayed?",
        answer: "You can view the latest courier transit updates using your tracking link. If delivery exceeds the estimated date by over 48 hours, please reach out via live chat.",
        displayOrder: 2,
      },
      {
        question: "Can I change my delivery address after placing an order?",
        answer: "Address changes can be requested before dispatch by contacting customer support. Once an order is with the courier partner, rerouting cannot be guaranteed.",
        displayOrder: 3,
      },
      {
        question: "How does Express Same-Day Delivery work?",
        answer: "Express 2-hour or same-day delivery is available in select metro areas for store-fulfilled items ordered before 4:00 PM.",
        displayOrder: 4,
      },
      {
        question: "What happens if I miss my delivery attempt?",
        answer: "Our courier partner will attempt delivery up to 3 times on consecutive days. You will also receive an SMS to reschedule your delivery slot.",
        displayOrder: 5,
      },
    ],
  },
  {
    name: "Returns & Refunds",
    description: "Find answers about returns, refunds and return-related questions.",
    icon: "returns_refunds",
    displayOrder: 4,
    faqs: [
      {
        question: "How can I return my product?",
        answer: "You can initiate a return from the My Orders section. Select the product, choose the return reason, and schedule a convenient doorstep pickup.",
        displayOrder: 1,
      },
      {
        question: "How many days do I have to return a product?",
        answer: "Decathlon offers a generous 30-day return policy for unused products in original packaging with tags intact. Membership members enjoy extended return windows.",
        displayOrder: 2,
      },
      {
        question: "When will I receive my refund?",
        answer: "Once our courier picks up the product and quality inspection is cleared, your refund is initiated immediately and credited within 3-5 business days.",
        displayOrder: 3,
      },
      {
        question: "How can I check my refund status?",
        answer: "You can check your refund status by navigating to My Account > Orders & Returns, selecting your returned item, and viewing the refund progress timeline.",
        displayOrder: 4,
      },
      {
        question: "Can I return an online purchase to any physical Decathlon store?",
        answer: "Yes, you can return any eligible online order to your nearest Decathlon store for an instant refund or immediate product replacement.",
        displayOrder: 5,
      },
      {
        question: "Which items are not eligible for returns?",
        answer: "For hygiene and safety reasons, innerwear, swimwear without protective lining, perishable energy food, and customized printed items cannot be returned.",
        displayOrder: 6,
      },
    ],
  },
  {
    name: "Exchange",
    description: "Product exchange, replacement help, and sizing queries.",
    icon: "exchange",
    displayOrder: 5,
    faqs: [
      {
        question: "How do I request a size or color exchange?",
        answer: "Go to My Orders, click 'Exchange Item', select your preferred replacement size or color, and confirm. We will arrange a simultaneous reverse pickup and delivery.",
        displayOrder: 1,
      },
      {
        question: "Can I exchange an online item directly at a Decathlon store?",
        answer: "Yes, store exchanges are completely free and instantaneous! Just bring your product with invoice or order confirmation to any Decathlon store.",
        displayOrder: 2,
      },
      {
        question: "What if the size I want is out of stock?",
        answer: "If the requested size is unavailable, you can opt for a full refund or choose an alternative model with price adjustment.",
        displayOrder: 3,
      },
      {
        question: "Is there any charge for replacement pickups?",
        answer: "Doorstep exchanges and pickups for size or defective replacements are 100% free of charge.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Warranty",
    description: "Warranty coverage, manufacturing defect claims, and guarantees.",
    icon: "warranty",
    displayOrder: 6,
    faqs: [
      {
        question: "What is covered under Decathlon's 2-year warranty?",
        answer: "All Decathlon Passion Brand products come with a minimum 2-year warranty covering material flaws, seam failures, and manufacturing defects under normal usage.",
        displayOrder: 1,
      },
      {
        question: "How do I claim warranty for a damaged product?",
        answer: "You can claim warranty online by raising a support request with product photos, or by visiting the Workshop desk at any Decathlon store.",
        displayOrder: 2,
      },
      {
        question: "Do I need the physical paper bill to claim warranty?",
        answer: "No, physical paper bills are not required. If you purchased as a registered member, your digital purchase receipt is permanently saved on your account.",
        displayOrder: 3,
      },
      {
        question: "Which products offer extended warranties?",
        answer: "Select bicycle frames, rigid forks, and handlebars feature a lifetime warranty. Backpacks typically feature a 10-year warranty.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "My Account",
    description: "Login, account security, profile information, and digital card.",
    icon: "account",
    displayOrder: 7,
    faqs: [
      {
        question: "How do I change my registered phone number or email?",
        answer: "Log in to your account, visit Profile > Personal Information, and update your phone number or email address with OTP verification.",
        displayOrder: 1,
      },
      {
        question: "How do I reset my account login password?",
        answer: "Click 'Login' on the top navbar, select 'Forgot Password', enter your email/phone number, and follow the password reset link or OTP sent to you.",
        displayOrder: 2,
      },
      {
        question: "Where can I view my digital membership card?",
        answer: "Your digital membership QR card is accessible anytime in the Decathlon App or under My Account > Digital Card on the web portal.",
        displayOrder: 3,
      },
      {
        question: "How can I permanently delete or deactivate my account?",
        answer: "Under Account Settings > Privacy & Data, you can submit an account erasure request in compliance with data privacy regulations.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Products",
    description: "Product information, sizing advice, availability, and stock.",
    icon: "products",
    displayOrder: 8,
    faqs: [
      {
        question: "How do I find the correct size for footwear and apparel?",
        answer: "Every product page includes an interactive 'Size Guide' with measurement instructions in centimeters and UK/EU conversion charts.",
        displayOrder: 1,
      },
      {
        question: "When will an out-of-stock product be replenished?",
        answer: "Click 'Notify Me' on any out-of-stock product page to receive an automated notification as soon as fresh inventory arrives.",
        displayOrder: 2,
      },
      {
        question: "Can I check store inventory availability online?",
        answer: "Yes, select 'Check in-store availability' on the product page and choose your nearest city to view real-time shelf stock.",
        displayOrder: 3,
      },
      {
        question: "Where can I download user manuals and assembly instructions?",
        answer: "User manuals and assembly videos for tents, fitness equipment, and cycles are available in the 'Specifications & Downloads' tab on the product page.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Stores",
    description: "Store locations, operating hours, amenities, and community events.",
    icon: "stores",
    displayOrder: 9,
    faqs: [
      {
        question: "Where is the nearest Decathlon store near me?",
        answer: "Visit our 'Find a Store' page or click 'My Store' in the navigation bar to locate all nearby stores with driving directions.",
        displayOrder: 1,
      },
      {
        question: "What are Decathlon store operating hours?",
        answer: "Most Decathlon stores in India operate from 10:00 AM to 10:00 PM, 7 days a week, including public holidays.",
        displayOrder: 2,
      },
      {
        question: "Can I test sports products in-store before buying?",
        answer: "Yes! Decathlon stores feature dedicated test zones where you can try roller skates, bicycles, cricket bats, treadmills, and fitness equipment.",
        displayOrder: 3,
      },
      {
        question: "How do I register for sports workshops and community runs?",
        answer: "Visit the Decathlon Play platform or check your local store's community board to sign up for weekly runs, yoga sessions, and sports tournaments.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Installation & Services",
    description: "Help with installation, cycle workshop, and maintenance services.",
    icon: "installation",
    displayOrder: 10,
    faqs: [
      {
        question: "How do I book equipment installation for home gym gear?",
        answer: "For treadmills, exercise bikes, and multi-gyms, you can select installation during checkout or schedule a technician visit via Support.",
        displayOrder: 1,
      },
      {
        question: "Where can I get my bicycle serviced or tuned up?",
        answer: "Every Decathlon store has an in-house Workshop desk providing free first checkups, gear tuning, hydraulic brake servicing, and tire repairs.",
        displayOrder: 2,
      },
      {
        question: "Do Decathlon stores offer badminton and tennis racket restringing?",
        answer: "Yes, our store workshops offer professional racket restringing with electronic tension machines and a wide selection of branded strings.",
        displayOrder: 3,
      },
      {
        question: "What are the workshop service charges?",
        answer: "Standard maintenance tariffs are transparently displayed at store workshops, and estimates are provided prior to starting any maintenance.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Offers & Coupons",
    description: "Coupons, promotional discounts, and payment partner offers.",
    icon: "offers",
    displayOrder: 11,
    faqs: [
      {
        question: "How do I apply a coupon code to my shopping cart?",
        answer: "On the Cart or Delivery page, click 'Apply Coupon', select from eligible active coupons or type your promo code, and click Apply.",
        displayOrder: 1,
      },
      {
        question: "Why is my coupon code not applying?",
        answer: "Coupons may have minimum order value requirements, brand restrictions, or expiration dates. Check the coupon terms in the coupon drawer.",
        displayOrder: 2,
      },
      {
        question: "Can I club multiple coupons together on a single order?",
        answer: "Only one promotional coupon code can be applied per checkout. However, coupon discounts can be combined with instant bank card promotions.",
        displayOrder: 3,
      },
      {
        question: "How do loyalty membership reward points work?",
        answer: "Members earn points on every purchase across stores and online. Points can be directly redeemed for instant bill discounts at checkout.",
        displayOrder: 4,
      },
    ],
  },
  {
    name: "Contact Support",
    description: "Get additional help from our specialized customer support team.",
    icon: "contact",
    displayOrder: 12,
    faqs: [
      {
        question: "What are the customer care contact hours?",
        answer: "Our customer support team is available from 6:00 AM to 10:00 PM IST, Monday to Sunday via live chat, email, and phone helpline.",
        displayOrder: 1,
      },
      {
        question: "How can I speak with a customer care specialist directly?",
        answer: "You can call our toll-free helpline at 1800 258 7777 or request an immediate callback through the live chat widget.",
        displayOrder: 2,
      },
      {
        question: "What is Decathlon's official customer support email?",
        answer: "You can email our customer happiness team at care.india@decathlon.com for detailed order or product assistance.",
        displayOrder: 3,
      },
      {
        question: "How do I escalate an unresolved complaint?",
        answer: "If your inquiry requires further review, our team will generate an escalation ticket number with guaranteed resolution within 24 hours.",
        displayOrder: 4,
      },
    ],
  },
];

/**
 * Seed function: Idempotent migration of categories and FAQs
 */
export const seedSupportData = async () => {
  try {
    let categoriesCreated = 0;
    let faqsCreated = 0;

    for (const catData of initialSupportData) {
      // Find or create category by name
      let category = await SupportCategory.findOne({ name: catData.name });
      if (!category) {
        category = new SupportCategory({
          name: catData.name,
          description: catData.description,
          icon: catData.icon,
          displayOrder: catData.displayOrder,
          isActive: true,
        });
        await category.save();
        categoriesCreated++;
      }

      // Find or create FAQs
      if (Array.isArray(catData.faqs)) {
        for (const faqData of catData.faqs) {
          const existingFaq = await SupportFAQ.findOne({
            category: category._id,
            question: faqData.question,
          });

          if (!existingFaq) {
            const newFaq = new SupportFAQ({
              category: category._id,
              question: faqData.question,
              answer: faqData.answer,
              displayOrder: faqData.displayOrder || 0,
              isActive: true,
            });
            await newFaq.save();
            faqsCreated++;
          }
        }
      }
    }

    if (categoriesCreated > 0 || faqsCreated > 0) {
      console.log(
        `✓ Support Seed completed: ${categoriesCreated} categories created, ${faqsCreated} FAQs created.`
      );
    } else {
      console.log("✓ Support knowledge base already seeded and up-to-date in MongoDB.");
    }
  } catch (err) {
    console.error("Error running Support seed:", err);
  }
};

// If run directly via `node seedSupportData.js`
if (process.argv[1] && process.argv[1].endsWith("seedSupportData.js")) {
  import("dns").then((dns) => {
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (e) {}
  });

  import("dotenv/config").then(async () => {
    try {
      const dns = await import("dns");
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (e) {}
      await mongoose.connect(process.env.MONGO_URI);
      console.log("Connected to MongoDB for standalone Support seed...");
      await seedSupportData();
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB. Seed script complete.");
      process.exit(0);
    } catch (e) {
      console.error("Standalone Support seed failed:", e);
      process.exit(1);
    }
  });
}
