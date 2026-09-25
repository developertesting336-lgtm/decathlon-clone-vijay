import assert from "assert";

// Mock helper functions replicating frontend and backend logic

const TRACKING_STEPS = [
  { key: "ORDER_PLACED", label: "Order Placed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "REACHED_HUB", label: "Reached Nearest Hub" },
  { key: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

const RETURN_CUSTOMER_STEPS = [
  { key: "ORDER_DELIVERED", label: "Order Delivered" },
  { key: "REQUESTED", label: "Return Requested" },
  { key: "APPROVED", label: "Return Approved" },
  { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "RETURN_RECEIVED", label: "Return Received" },
  { key: "REFUND_PROCESSING", label: "Refund Processing" },
  { key: "REFUNDED", label: "Refunded" },
];

const EXCHANGE_CUSTOMER_STEPS = [
  { key: "ORDER_DELIVERED", label: "Order Delivered" },
  { key: "REQUESTED", label: "Exchange Requested" },
  { key: "APPROVED", label: "Exchange Approved" },
  { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "RECEIVED", label: "Product Received" },
  { key: "SHIPPED", label: "Replacement Shipped" },
  { key: "DELIVERED", label: "Replacement Delivered" },
];

const getCustomerStepIndex = (status) => {
  const norm = (status || "").toUpperCase();
  if (norm === "DELIVERED") return 4;
  if (norm === "OUT_FOR_DELIVERY") return 3;
  if (norm === "REACHED_HUB") return 2;
  if (norm === "SHIPPED") return 1;
  return 0;
};

const getReturnCustomerStepIndex = (status) => {
  const norm = (status || "").toUpperCase();
  const map = {
    ORDER_DELIVERED: 0,
    REQUESTED: 1,
    APPROVED: 2,
    PICKUP_SCHEDULED: 3,
    PICKED_UP: 4,
    RETURN_RECEIVED: 5,
    REFUND_PROCESSING: 6,
    REFUNDED: 7,
  };
  return map[norm] !== undefined ? map[norm] : 1;
};

const getExchangeCustomerStepIndex = (status) => {
  const norm = (status || "").toUpperCase();
  const map = {
    ORDER_DELIVERED: 0,
    REQUESTED: 1,
    APPROVED: 2,
    PICKUP_SCHEDULED: 3,
    PICKED_UP: 4,
    RECEIVED: 5,
    SHIPPED: 6,
    DELIVERED: 7,
  };
  return map[norm] !== undefined ? map[norm] : 1;
};

function simulateTrackingModal(order, tracking) {
  const isOrderCancelled =
    Boolean(tracking?.isCancelled) ||
    (tracking?.orderStatus || order?.orderStatus || "").toLowerCase() === "cancelled" ||
    (tracking?.status || "").toUpperCase() === "CANCELLED";

  const retStatus = (
    tracking?.returnStatus ||
    order?.returnStatus ||
    order?.returnRequest?.status ||
    "NONE"
  ).toUpperCase();
  const hasActiveReturn = retStatus !== "NONE" && retStatus !== "";
  const returnReq = tracking?.returnRequest || order?.returnRequest;

  const exchStatus = (
    tracking?.exchangeStatus ||
    order?.exchangeStatus ||
    order?.exchangeRequest?.status ||
    "NONE"
  ).toUpperCase();
  const hasActiveExchange = exchStatus !== "NONE" && exchStatus !== "";
  const exchangeReq = tracking?.exchangeRequest || order?.exchangeRequest;

  const isDelivered =
    (tracking?.status || order?.orderStatus || "").toUpperCase() === "DELIVERED" ||
    hasActiveReturn ||
    hasActiveExchange;

  const method = tracking?.paymentMethod || order.paymentMethod;
  const payStatus = (tracking?.paymentStatus || order.paymentStatus || "").toLowerCase();

  // Determine overview status text
  let statusBadgeText = "";
  if (isOrderCancelled) {
    statusBadgeText = "ORDER CANCELLED";
  } else if (hasActiveReturn) {
    statusBadgeText = `RETURN: ${retStatus}`;
  } else if (hasActiveExchange) {
    statusBadgeText = `EXCHANGE: ${exchStatus}`;
  } else {
    statusBadgeText = (tracking?.status || order?.orderStatus || "ORDER_PLACED").toUpperCase();
  }

  // Determine overview payment text
  let paymentText = "";
  if (hasActiveReturn) {
    if (method === "COD") {
      if (payStatus === "refunded" || retStatus === "REFUNDED") {
        paymentText = "Payment: REFUNDED (COD)";
      } else {
        paymentText = "Payment: COD REFUND PENDING";
      }
    } else {
      if (payStatus === "refunded" || retStatus === "REFUNDED") {
        paymentText = "Payment: REFUNDED";
      } else {
        paymentText = "Payment: REFUND PROCESSING";
      }
    }
  } else if (hasActiveExchange) {
    paymentText = method === "COD" ? (payStatus === "paid" ? "Payment: PAID (COD)" : "Payment: PENDING (COD)") : "Payment: PAID (Online)";
  } else if (isOrderCancelled) {
    if (payStatus === "refunded") {
      paymentText = "Payment: REFUNDED";
    } else if (method === "COD") {
      paymentText = "Payment: NOT CHARGED";
    } else {
      paymentText = "Payment: REFUND IN PROGRESS";
    }
  } else {
    if (payStatus === "refunded") paymentText = "Payment: REFUNDED";
    else if (payStatus === "paid") paymentText = method === "COD" ? "Payment: PAID (COD)" : "Payment: Paid";
    else paymentText = "Payment: Pending";
  }

  // Delivery ETA rule: never show delivery ETA if cancelled, delivered, return
  // If exchange has replacement ETA, show replacement ETA
  const etaText = isOrderCancelled
    ? "Not Applicable"
    : hasActiveReturn
    ? "Not Applicable (Order Delivered)"
    : hasActiveExchange
    ? (exchangeReq?.estimatedReplacementDeliveryDate ? `Replacement ETA: ${exchangeReq.estimatedReplacementDeliveryDate}` : "3-5 business days (Replacement)")
    : isDelivered
    ? "Not Applicable (Order Delivered)"
    : tracking?.estimatedDeliveryDate || "Within 2-3 business days";

  // Delivered date text: never show "Pending Delivery" for delivered, returned, or exchanged orders
  const deliveredDateText = isOrderCancelled
    ? "Not Delivered"
    : isDelivered || tracking?.deliveredAt || order?.deliveredAt
    ? tracking?.deliveredAt || order?.deliveredAt || "DELIVERED_TIMESTAMP"
    : "Pending Delivery";

  // Section 1: Delivery timeline
  let deliveryTimelineSteps = [];
  if (isOrderCancelled) {
    deliveryTimelineSteps = ["ORDER_PLACED", "ORDER_CANCELLED"];
  } else {
    deliveryTimelineSteps = TRACKING_STEPS.map((s) => s.key);
  }

  // Section 2: Return or Exchange timeline
  let returnTimelineSteps = [];
  let exchangeTimelineSteps = [];
  if (hasActiveReturn) {
    returnTimelineSteps = RETURN_CUSTOMER_STEPS.map((s) => s.key);
  }
  if (hasActiveExchange) {
    exchangeTimelineSteps = EXCHANGE_CUSTOMER_STEPS.map((s) => s.key);
  }

  return {
    isOrderCancelled,
    hasActiveReturn,
    hasActiveExchange,
    isDelivered,
    statusBadgeText,
    paymentText,
    etaText,
    deliveredDateText,
    deliveryTimelineSteps,
    returnTimelineSteps,
    exchangeTimelineSteps,
    returnStepIndex: hasActiveReturn ? getReturnCustomerStepIndex(retStatus) : null,
    exchangeStepIndex: hasActiveExchange ? getExchangeCustomerStepIndex(exchStatus) : null,
  };
}

console.log("==================================================");
console.log("RUNNING ORDER TRACKING 14 TEST CASES VERIFICATION");
console.log("==================================================\n");

const tests = [
  // 1. Normal order
  {
    name: "1. Normal order (SHIPPED)",
    order: { _id: "601", orderStatus: "shipped", paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "SHIPPED", estimatedDeliveryDate: "2026-10-01" },
    verify(res) {
      assert.strictEqual(res.isOrderCancelled, false);
      assert.strictEqual(res.hasActiveReturn, false);
      assert.strictEqual(res.hasActiveExchange, false);
      assert.deepStrictEqual(res.deliveryTimelineSteps, ["ORDER_PLACED", "SHIPPED", "REACHED_HUB", "OUT_FOR_DELIVERY", "DELIVERED"]);
      assert.strictEqual(res.deliveredDateText, "Pending Delivery");
      assert.strictEqual(res.etaText, "2026-10-01");
      assert.strictEqual(res.paymentText, "Payment: Paid");
    },
  },

  // 2. Cancelled order
  {
    name: "2. Cancelled order",
    order: { _id: "602", orderStatus: "cancelled", paymentMethod: "Stripe", paymentStatus: "refunded", cancelledAt: "2026-09-24" },
    tracking: { isCancelled: true, status: "CANCELLED" },
    verify(res) {
      assert.strictEqual(res.isOrderCancelled, true);
      assert.strictEqual(res.statusBadgeText, "ORDER CANCELLED");
      assert.deepStrictEqual(res.deliveryTimelineSteps, ["ORDER_PLACED", "ORDER_CANCELLED"]);
      assert(!res.deliveryTimelineSteps.includes("SHIPPED"), "Cancelled flow must NOT contain SHIPPED");
      assert(!res.deliveryTimelineSteps.includes("REACHED_HUB"), "Cancelled flow must NOT contain REACHED_HUB");
      assert(!res.deliveryTimelineSteps.includes("OUT_FOR_DELIVERY"), "Cancelled flow must NOT contain OUT_FOR_DELIVERY");
      assert(!res.deliveryTimelineSteps.includes("DELIVERED"), "Cancelled flow must NOT contain DELIVERED");
      assert.strictEqual(res.deliveredDateText, "Not Delivered");
      assert.strictEqual(res.etaText, "Not Applicable");
      assert.strictEqual(res.paymentText, "Payment: REFUNDED");
    },
  },

  // 3. Delivered order
  {
    name: "3. Delivered order",
    order: { _id: "603", orderStatus: "delivered", deliveredAt: "2026-09-20", paymentMethod: "COD", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", deliveredAt: "2026-09-20" },
    verify(res) {
      assert.strictEqual(res.isDelivered, true);
      assert.strictEqual(res.hasActiveReturn, false);
      assert.strictEqual(res.deliveredDateText, "2026-09-20");
      assert.strictEqual(res.etaText, "Not Applicable (Order Delivered)");
      assert.strictEqual(res.paymentText, "Payment: PAID (COD)");
    },
  },

  // 4. Return requested
  {
    name: "4. Return requested",
    order: { _id: "604", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "REQUESTED", returnRequest: { status: "REQUESTED", reason: "Defective" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", returnStatus: "REQUESTED", returnRequest: { status: "REQUESTED" } },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.isDelivered, true);
      assert.strictEqual(res.returnStepIndex, 1);
      assert.strictEqual(res.returnTimelineSteps.length, 8);
      assert.strictEqual(res.paymentText, "Payment: REFUND PROCESSING");
      assert.strictEqual(res.deliveredDateText, "2026-09-20");
      assert.strictEqual(res.etaText, "Not Applicable (Order Delivered)");
    },
  },

  // 5. Return approved
  {
    name: "5. Return approved",
    order: { _id: "605", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "APPROVED", returnRequest: { status: "APPROVED" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", returnStatus: "APPROVED" },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.returnStepIndex, 2);
      assert.strictEqual(res.paymentText, "Payment: REFUND PROCESSING");
    },
  },

  // 6. Return picked up
  {
    name: "6. Return picked up",
    order: { _id: "606", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "PICKED_UP", returnRequest: { status: "PICKED_UP" }, paymentMethod: "COD", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", returnStatus: "PICKED_UP" },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.returnStepIndex, 4);
      assert.strictEqual(res.paymentText, "Payment: COD REFUND PENDING");
    },
  },

  // 7. Return received
  {
    name: "7. Return received",
    order: { _id: "607", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "RETURN_RECEIVED", returnRequest: { status: "RETURN_RECEIVED" }, paymentMethod: "COD", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", returnStatus: "RETURN_RECEIVED" },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.returnStepIndex, 5);
      assert.strictEqual(res.paymentText, "Payment: COD REFUND PENDING");
    },
  },

  // 8. Refund processing
  {
    name: "8. Refund processing",
    order: { _id: "608", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "REFUND_PROCESSING", returnRequest: { status: "REFUND_PROCESSING" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", returnStatus: "REFUND_PROCESSING" },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.returnStepIndex, 6);
      assert.strictEqual(res.paymentText, "Payment: REFUND PROCESSING");
    },
  },

  // 9. Refunded
  {
    name: "9. Refunded",
    order: { _id: "609", orderStatus: "delivered", deliveredAt: "2026-09-20", returnStatus: "REFUNDED", returnRequest: { status: "REFUNDED" }, paymentMethod: "Stripe", paymentStatus: "refunded" },
    tracking: { status: "DELIVERED", returnStatus: "REFUNDED", paymentStatus: "refunded" },
    verify(res) {
      assert.strictEqual(res.hasActiveReturn, true);
      assert.strictEqual(res.returnStepIndex, 7);
      assert.strictEqual(res.paymentText, "Payment: REFUNDED");
    },
  },

  // 10. Exchange requested
  {
    name: "10. Exchange requested",
    order: { _id: "610", orderStatus: "delivered", deliveredAt: "2026-09-20", exchangeStatus: "REQUESTED", exchangeRequest: { status: "REQUESTED", originalSize: "M", newSize: "L" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", exchangeStatus: "REQUESTED", exchangeRequest: { status: "REQUESTED", originalSize: "M", newSize: "L" } },
    verify(res) {
      assert.strictEqual(res.hasActiveExchange, true);
      assert.strictEqual(res.isDelivered, true);
      assert.strictEqual(res.exchangeStepIndex, 1);
      assert.strictEqual(res.exchangeTimelineSteps.length, 8);
      assert.strictEqual(res.paymentText, "Payment: PAID (Online)");
      assert.strictEqual(res.deliveredDateText, "2026-09-20");
    },
  },

  // 11. Exchange approved
  {
    name: "11. Exchange approved",
    order: { _id: "611", orderStatus: "delivered", deliveredAt: "2026-09-20", exchangeStatus: "APPROVED", exchangeRequest: { status: "APPROVED", newSize: "XL" }, paymentMethod: "COD", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", exchangeStatus: "APPROVED" },
    verify(res) {
      assert.strictEqual(res.hasActiveExchange, true);
      assert.strictEqual(res.exchangeStepIndex, 2);
      assert.strictEqual(res.paymentText, "Payment: PAID (COD)");
    },
  },

  // 12. Exchange picked up
  {
    name: "12. Exchange picked up",
    order: { _id: "612", orderStatus: "delivered", deliveredAt: "2026-09-20", exchangeStatus: "PICKED_UP", exchangeRequest: { status: "PICKED_UP" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", exchangeStatus: "PICKED_UP" },
    verify(res) {
      assert.strictEqual(res.hasActiveExchange, true);
      assert.strictEqual(res.exchangeStepIndex, 4);
      assert.strictEqual(res.paymentText, "Payment: PAID (Online)");
    },
  },

  // 13. Replacement shipped
  {
    name: "13. Replacement shipped",
    order: { _id: "613", orderStatus: "delivered", deliveredAt: "2026-09-20", exchangeStatus: "SHIPPED", exchangeRequest: { status: "SHIPPED", replacementTrackingNumber: "TRK-EXCH-9999", estimatedReplacementDeliveryDate: "2026-10-05" }, paymentMethod: "Stripe", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", exchangeStatus: "SHIPPED", exchangeRequest: { status: "SHIPPED", replacementTrackingNumber: "TRK-EXCH-9999", estimatedReplacementDeliveryDate: "2026-10-05" } },
    verify(res) {
      assert.strictEqual(res.hasActiveExchange, true);
      assert.strictEqual(res.exchangeStepIndex, 6);
      assert.strictEqual(res.paymentText, "Payment: PAID (Online)");
      assert.strictEqual(res.etaText, "Replacement ETA: 2026-10-05");
    },
  },

  // 14. Replacement delivered
  {
    name: "14. Replacement delivered",
    order: { _id: "614", orderStatus: "delivered", deliveredAt: "2026-09-20", exchangeStatus: "DELIVERED", exchangeRequest: { status: "DELIVERED", replacementDeliveredAt: "2026-10-06" }, paymentMethod: "COD", paymentStatus: "paid" },
    tracking: { status: "DELIVERED", exchangeStatus: "DELIVERED" },
    verify(res) {
      assert.strictEqual(res.hasActiveExchange, true);
      assert.strictEqual(res.exchangeStepIndex, 7);
      assert.strictEqual(res.paymentText, "Payment: PAID (COD)");
    },
  },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    const res = simulateTrackingModal(t.order, t.tracking);
    t.verify(res);
    console.log(`[PASS] ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${t.name}:`, err.message);
    failed++;
  }
}

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length})`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
