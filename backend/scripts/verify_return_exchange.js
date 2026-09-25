import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const BASE_URL = "http://localhost:5000/api";

const apiPost = async (url, body, token) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const apiPut = async (url, body, token) => {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const apiGet = async (url, token) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

async function runTests() {
  console.log("====================================================");
  console.log("DECATHLON CLONE: RETURN + EXCHANGE TEST SUITE");
  console.log("====================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB Atlas");

  const adminUser = await User.findOne({ email: "vijay@gmail.com" });
  const customerUser = await User.findOne({ email: "developertesting336@gmail.com" });

  if (!adminUser || !customerUser) {
    throw new Error("Admin or Customer user not found in DB!");
  }
  console.log(`✓ Admin User: ${adminUser.name} (${adminUser.email})`);
  console.log(`✓ Customer User: ${customerUser.name} (${customerUser.email})\n`);

  const adminToken = jwt.sign(
    { id: adminUser._id, role: adminUser.role || "admin" },
    process.env.JWT_SECRET || "secretkey",
    { expiresIn: "1d" }
  );

  const customerToken = jwt.sign(
    { id: customerUser._id, role: "customer" },
    process.env.JWT_SECRET || "secretkey",
    { expiresIn: "1d" }
  );

  // Find or create test product
  let testProduct = await Product.findOne({ isActive: true, stock: { $gt: 10 } });
  if (!testProduct) {
    testProduct = await Product.create({
      name: "Decathlon Kiprun Running Shoes",
      description: "Breathable and cushioned running shoes for marathon training",
      price: 1999,
      discountPrice: 1799,
      stock: 25,
      category: new mongoose.Types.ObjectId(),
      size: ["UK 7", "UK 8", "UK 9", "UK 10"],
      color: "Blue",
      isActive: true,
    });
    console.log("✓ Created test product for tests");
  }

  // Ensure test product has sizes
  if (!testProduct.size || testProduct.size.length < 2) {
    testProduct.size = ["UK 7", "UK 8", "UK 9", "UK 10"];
    await testProduct.save();
  }

  console.log(`✓ Test Product: ${testProduct.name} | Stock: ${testProduct.stock} | Sizes: ${testProduct.size.join(", ")}\n`);

  let testOrder = await Order.findOne({ user: customerUser._id });
  if (!testOrder) {
    testOrder = await Order.create({
      user: customerUser._id,
      orderItems: [
        {
          product: testProduct._id,
          name: testProduct.name,
          quantity: 2,
          price: testProduct.price,
          size: "UK 8",
          color: "Blue",
          image: "/uploads/sample.jpg",
        },
      ],
      shippingAddress: {
        firstName: "Developer",
        lastName: "Testing",
        address: "Decathlon Hub, 100 Main St",
        city: "Bangalore",
        postalCode: "560001",
        country: "India",
        mobile: "9876543210",
      },
      paymentMethod: "COD",
      paymentStatus: "paid",
      totalAmount: testProduct.price * 2,
      orderStatus: "delivered",
      deliveredAt: new Date(),
    });
  } else {
    testOrder.orderItems = [
      {
        product: testProduct._id,
        name: testProduct.name,
        quantity: 2,
        price: testProduct.price,
        size: "UK 8",
        color: "Blue",
        image: "/uploads/sample.jpg",
      },
    ];
    testOrder.totalAmount = testProduct.price * 2;
    await testOrder.save();
  }

  console.log("====================================================");
  console.log("PART 1: POSITIVE RETURN LIFECYCLE");
  console.log("====================================================");

  // Reset testOrder for return test
  testOrder.orderStatus = "delivered";
  testOrder.deliveredAt = new Date();
  testOrder.paymentMethod = "COD";
  testOrder.paymentStatus = "paid";
  testOrder.stripePaymentIntentId = null;
  testOrder.returnStatus = "NONE";
  testOrder.returnRequest = null;
  testOrder.exchangeStatus = "NONE";
  testOrder.exchangeRequest = null;
  await testOrder.save();

  const initialProdStock = (await Product.findById(testProduct._id)).stock;

  // Step 1: Customer requests return
  console.log("Step 1: Customer submits return request...");
  const retReqRes = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/return`,
    {
      items: [
        {
          productId: testProduct._id.toString(),
          quantity: 1,
        },
      ],
      reason: "Product doesn't fit",
      details: "Size is a bit too tight for running",
    },
    customerToken
  );

  console.log(`Response status: ${retReqRes.status} | message: ${retReqRes.data?.message}`);
  if (retReqRes.status !== 200 || retReqRes.data?.order?.returnStatus !== "REQUESTED") {
    throw new Error(`Failed to submit return request: ${JSON.stringify(retReqRes.data)}`);
  }
  console.log("✓ Return successfully requested (returnStatus: REQUESTED)");

  // Step 2: Admin approves return
  console.log("Step 2: Admin approves return...");
  const retApproveRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "APPROVED", adminNote: "Return approved by QA" },
    adminToken
  );
  if (retApproveRes.status !== 200 || retApproveRes.data?.order?.returnStatus !== "APPROVED") {
    throw new Error(`Failed to approve return: ${JSON.stringify(retApproveRes.data)}`);
  }
  console.log("✓ Return approved (returnStatus: APPROVED)");

  // Step 3: Admin schedules pickup
  console.log("Step 3: Admin schedules pickup...");
  const retPickupSchedRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "PICKUP_SCHEDULED", adminNote: "Pickup scheduled with courier" },
    adminToken
  );
  if (retPickupSchedRes.status !== 200 || retPickupSchedRes.data?.order?.returnStatus !== "PICKUP_SCHEDULED") {
    throw new Error(`Failed to schedule pickup: ${JSON.stringify(retPickupSchedRes.data)}`);
  }
  console.log("✓ Pickup scheduled (returnStatus: PICKUP_SCHEDULED)");

  // Step 4: Admin marks picked up
  console.log("Step 4: Admin marks picked up...");
  const retPickedUpRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "PICKED_UP", adminNote: "Courier picked up parcel" },
    adminToken
  );
  if (retPickedUpRes.status !== 200 || retPickedUpRes.data?.order?.returnStatus !== "PICKED_UP") {
    throw new Error(`Failed to mark picked up: ${JSON.stringify(retPickedUpRes.data)}`);
  }
  console.log("✓ Picked up marked (returnStatus: PICKED_UP)");

  // Step 5: Admin marks return received
  console.log("Step 5: Admin marks return received...");
  const retReceivedRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "RETURN_RECEIVED", adminNote: "Returned items inspected in warehouse" },
    adminToken
  );
  if (retReceivedRes.status !== 200 || retReceivedRes.data?.order?.returnStatus !== "RETURN_RECEIVED") {
    throw new Error(`Failed to mark return received: ${JSON.stringify(retReceivedRes.data)}`);
  }
  const stockAfterReturnReceived = (await Product.findById(testProduct._id)).stock;
  console.log(`✓ Return received (returnStatus: RETURN_RECEIVED) | Stock changed from ${initialProdStock} to ${stockAfterReturnReceived}`);
  if (stockAfterReturnReceived !== initialProdStock + 1) {
    throw new Error(`Stock was not properly restocked on RETURN_RECEIVED! Expected ${initialProdStock + 1}, got ${stockAfterReturnReceived}`);
  }

  // Step 6: Admin processes refund (COD flow)
  console.log("Step 6: Admin processes COD refund...");
  const refundRes = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/process-return-refund`,
    { adminNote: "COD refund given via cash/NEFT" },
    adminToken
  );
  if (refundRes.status !== 200 || refundRes.data?.order?.returnStatus !== "REFUNDED") {
    throw new Error(`Failed to process refund: ${JSON.stringify(refundRes.data)}`);
  }
  console.log("✓ COD Refund successfully completed (returnStatus: REFUNDED, paymentStatus: refunded, orderStatus: returned)\n");

  console.log("====================================================");
  console.log("PART 2: POSITIVE EXCHANGE LIFECYCLE");
  console.log("====================================================");

  // Prepare order for exchange test using findByIdAndUpdate to bypass in-memory caching
  await Order.findByIdAndUpdate(testOrder._id, {
    $set: {
      orderStatus: "delivered",
      deliveredAt: new Date(),
      returnStatus: "NONE",
      returnRequest: null,
      exchangeStatus: "NONE",
      exchangeRequest: null,
    },
  });

  const validExchangeCurrentSize = testProduct.size[0];
  const validExchangeNewSize = testProduct.size[1] || testProduct.size[0];

  const stockBeforeExchange = (await Product.findById(testProduct._id)).stock;

  // Step 1: Customer submits exchange request
  console.log("Step 1: Customer submits exchange request...");
  const excReqRes = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/exchange`,
    {
      productId: testProduct._id.toString(),
      quantity: 1,
      currentSize: validExchangeCurrentSize,
      newSize: validExchangeNewSize,
      reason: "Wrong size",
      details: "Need replacement size for better fit",
    },
    customerToken
  );

  console.log(`Response status: ${excReqRes.status} | message: ${excReqRes.data?.message}`);
  if (excReqRes.status !== 200 || excReqRes.data?.order?.exchangeStatus !== "REQUESTED") {
    throw new Error(`Failed to submit exchange request: ${JSON.stringify(excReqRes.data)}`);
  }

  const stockAfterExcRequest = (await Product.findById(testProduct._id)).stock;
  console.log(`✓ Exchange requested (exchangeStatus: REQUESTED) | Stock reserved: ${stockBeforeExchange} -> ${stockAfterExcRequest}`);
  if (stockAfterExcRequest !== stockBeforeExchange - 1) {
    throw new Error(`Stock was not decremented/reserved on exchange request! Expected ${stockBeforeExchange - 1}, got ${stockAfterExcRequest}`);
  }

  // Step 2: Admin approves exchange
  console.log("Step 2: Admin approves exchange...");
  const excApproveRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "APPROVED", adminNote: "Exchange approved" },
    adminToken
  );
  if (excApproveRes.status !== 200 || excApproveRes.data?.order?.exchangeStatus !== "APPROVED") {
    throw new Error(`Failed to approve exchange: ${JSON.stringify(excApproveRes.data)}`);
  }
  console.log("✓ Exchange approved (exchangeStatus: APPROVED)");

  // Step 3: Admin schedules pickup
  console.log("Step 3: Admin schedules pickup...");
  const excPickupSchedRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "PICKUP_SCHEDULED" },
    adminToken
  );
  if (excPickupSchedRes.status !== 200 || excPickupSchedRes.data?.order?.exchangeStatus !== "PICKUP_SCHEDULED") {
    throw new Error(`Failed to schedule exchange pickup: ${JSON.stringify(excPickupSchedRes.data)}`);
  }
  console.log("✓ Exchange pickup scheduled (exchangeStatus: PICKUP_SCHEDULED)");

  // Step 4: Admin marks picked up
  console.log("Step 4: Admin marks picked up...");
  const excPickedUpRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "PICKED_UP" },
    adminToken
  );
  if (excPickedUpRes.status !== 200 || excPickedUpRes.data?.order?.exchangeStatus !== "PICKED_UP") {
    throw new Error(`Failed to mark exchange picked up: ${JSON.stringify(excPickedUpRes.data)}`);
  }
  console.log("✓ Exchange marked picked up (exchangeStatus: PICKED_UP)");

  // Step 5: Admin marks received
  console.log("Step 5: Admin marks received...");
  const excReceivedRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "RECEIVED" },
    adminToken
  );
  if (excReceivedRes.status !== 200 || excReceivedRes.data?.order?.exchangeStatus !== "RECEIVED") {
    throw new Error(`Failed to mark exchange received: ${JSON.stringify(excReceivedRes.data)}`);
  }
  const stockAfterExcReceived = (await Product.findById(testProduct._id)).stock;
  console.log(`✓ Original item received in warehouse (exchangeStatus: RECEIVED) | Original stock restored: ${stockAfterExcRequest} -> ${stockAfterExcReceived}`);
  if (stockAfterExcReceived !== stockBeforeExchange) {
    throw new Error(`Original stock was not restored on exchange RECEIVED! Expected ${stockBeforeExchange}, got ${stockAfterExcReceived}`);
  }

  // Step 6: Admin ships replacement
  console.log("Step 6: Admin ships replacement...");
  const excShippedRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "SHIPPED", adminNote: "Replacement UK 9 dispatched" },
    adminToken
  );
  if (excShippedRes.status !== 200 || excShippedRes.data?.order?.exchangeStatus !== "SHIPPED") {
    throw new Error(`Failed to ship replacement: ${JSON.stringify(excShippedRes.data)}`);
  }
  console.log("✓ Replacement shipped (exchangeStatus: SHIPPED)");

  // Step 7: Admin marks delivered
  console.log("Step 7: Admin marks replacement delivered...");
  const excDeliveredRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "DELIVERED" },
    adminToken
  );
  if (excDeliveredRes.status !== 200 || excDeliveredRes.data?.order?.exchangeStatus !== "DELIVERED") {
    throw new Error(`Failed to deliver replacement: ${JSON.stringify(excDeliveredRes.data)}`);
  }
  console.log("✓ Exchange delivered and completed (exchangeStatus: DELIVERED)\n");

  console.log("====================================================");
  console.log("PART 3: COMPREHENSIVE NEGATIVE TESTS & EDGE CASES");
  console.log("====================================================");

  // Test 1: Return non-delivered order
  console.log("Negative Test 1: Return non-delivered order...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "shipped",
    returnStatus: "NONE",
    exchangeStatus: "NONE",
  });

  const negReturnNonDelivered = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/return`,
    { items: [{ productId: testProduct._id.toString(), quantity: 1 }], reason: "Product damaged" },
    customerToken
  );
  console.log(`Status: ${negReturnNonDelivered.status} | message: ${negReturnNonDelivered.data?.message}`);
  if (negReturnNonDelivered.status !== 400) {
    throw new Error("Expected non-delivered return to fail with 400");
  }
  console.log("✓ Properly rejected return on non-delivered order");

  // Test 2: Exchange non-delivered order
  console.log("Negative Test 2: Exchange non-delivered order...");
  const negExchangeNonDelivered = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/exchange`,
    { productId: testProduct._id.toString(), quantity: 1, newSize: validExchangeNewSize, reason: "Wrong size" },
    customerToken
  );
  console.log(`Status: ${negExchangeNonDelivered.status} | message: ${negExchangeNonDelivered.data?.message}`);
  if (negExchangeNonDelivered.status !== 400) {
    throw new Error("Expected non-delivered exchange to fail with 400");
  }
  console.log("✓ Properly rejected exchange on non-delivered order");

  // Reset to delivered
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "NONE",
    exchangeStatus: "NONE",
  });

  // Test 3: Invalid quantity (> purchased quantity)
  console.log("Negative Test 3: Return quantity exceeding purchased quantity...");
  const negQtyRes = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/return`,
    { items: [{ productId: testProduct._id.toString(), quantity: 99 }], reason: "Product damaged" },
    customerToken
  );
  console.log(`Status: ${negQtyRes.status} | message: ${negQtyRes.data?.message}`);
  if (negQtyRes.status !== 400) {
    throw new Error("Expected invalid quantity return to fail with 400");
  }
  console.log("✓ Properly rejected invalid return quantity");

  // Test 4: Out-of-stock replacement
  console.log("Negative Test 4: Out-of-stock replacement variant...");
  const originalStock = testProduct.stock;
  testProduct.stock = 0;
  await testProduct.save();

  const negOutOfStockRes = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/exchange`,
    { productId: testProduct._id.toString(), quantity: 1, newSize: validExchangeNewSize, reason: "Wrong size" },
    customerToken
  );
  console.log(`Status: ${negOutOfStockRes.status} | message: ${negOutOfStockRes.data?.message}`);
  testProduct.stock = originalStock;
  await testProduct.save();

  if (negOutOfStockRes.status !== 400 || !negOutOfStockRes.data?.message?.includes("out of stock")) {
    throw new Error("Expected out-of-stock exchange to fail with 400 'Selected replacement variant is out of stock.'");
  }
  console.log("✓ Properly rejected out-of-stock replacement request");

  // Test 5: Invalid status transition (REQUESTED -> REFUNDED)
  console.log("Negative Test 5: Invalid return status transition (REQUESTED -> REFUNDED)...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "REQUESTED",
    exchangeStatus: "NONE",
  });

  const negTransitionRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "REFUNDED" },
    adminToken
  );
  console.log(`Status: ${negTransitionRes.status} | message: ${negTransitionRes.data?.message}`);
  if (negTransitionRes.status !== 400) {
    throw new Error("Expected invalid transition to fail with 400");
  }
  console.log("✓ Properly blocked illegal status transition (REQUESTED -> REFUNDED)");

  // Test 6: Invalid exchange transition (REQUESTED -> DELIVERED)
  console.log("Negative Test 6: Invalid exchange status transition (REQUESTED -> DELIVERED)...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "NONE",
    exchangeStatus: "REQUESTED",
  });

  const negExcTransitionRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "DELIVERED" },
    adminToken
  );
  console.log(`Status: ${negExcTransitionRes.status} | message: ${negExcTransitionRes.data?.message}`);
  if (negExcTransitionRes.status !== 400) {
    throw new Error("Expected invalid exchange transition to fail with 400");
  }
  console.log("✓ Properly blocked illegal exchange transition (REQUESTED -> DELIVERED)");

  // Test 7: Return when exchange is active (mutual exclusion)
  console.log("Negative Test 7: Mutual exclusion - return requested while exchange active...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "NONE",
    exchangeStatus: "APPROVED",
  });

  const negReturnWhenExcActive = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/return`,
    { items: [{ productId: testProduct._id.toString(), quantity: 1 }], reason: "Product damaged" },
    customerToken
  );
  console.log(`Status: ${negReturnWhenExcActive.status} | message: ${negReturnWhenExcActive.data?.message}`);
  if (negReturnWhenExcActive.status !== 400) {
    throw new Error("Expected return request to fail when exchange is active");
  }
  console.log("✓ Properly enforced mutual exclusion (cannot return while exchange active)");

  // Test 8: Exchange when return is active (mutual exclusion)
  console.log("Negative Test 8: Mutual exclusion - exchange requested while return active...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "APPROVED",
    exchangeStatus: "NONE",
  });

  const negExcWhenRetActive = await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/exchange`,
    { productId: testProduct._id.toString(), quantity: 1, newSize: validExchangeNewSize, reason: "Wrong size" },
    customerToken
  );
  console.log(`Status: ${negExcWhenRetActive.status} | message: ${negExcWhenRetActive.data?.message}`);
  if (negExcWhenRetActive.status !== 400) {
    throw new Error("Expected exchange request to fail when return is active");
  }
  console.log("✓ Properly enforced mutual exclusion (cannot exchange while return active)");

  // Test 9: Customer attempting admin endpoints
  console.log("Negative Test 9: Customer attempting admin action...");
  const negCustAdminRes = await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/return-status`,
    { returnStatus: "APPROVED" },
    customerToken
  );
  console.log(`Status: ${negCustAdminRes.status} | message: ${negCustAdminRes.data?.message}`);
  if (negCustAdminRes.status !== 403) {
    throw new Error("Expected customer attempting admin endpoint to fail with 403 Forbidden");
  }
  console.log("✓ Properly secured admin endpoints from non-admin customers (403 Forbidden)");

  // Test 10: Exchange cancellation releases reserved stock
  console.log("Negative Test 10: Exchange rejected/cancelled releases reserved replacement stock...");
  await Order.findByIdAndUpdate(testOrder._id, {
    orderStatus: "delivered",
    returnStatus: "NONE",
    exchangeStatus: "NONE",
  });

  const stockBeforeReq = (await Product.findById(testProduct._id)).stock;
  await apiPost(
    `${BASE_URL}/orders/${testOrder._id}/exchange`,
    { productId: testProduct._id.toString(), quantity: 1, newSize: validExchangeNewSize, reason: "Wrong size" },
    customerToken
  );
  const stockAfterReq = (await Product.findById(testProduct._id)).stock;
  if (stockAfterReq !== stockBeforeReq - 1) {
    throw new Error("Stock should have decremented on exchange request");
  }

  // Admin rejects exchange
  await apiPut(
    `${BASE_URL}/orders/${testOrder._id}/exchange-status`,
    { exchangeStatus: "REJECTED", adminNote: "Item condition not acceptable" },
    adminToken
  );
  const stockAfterReject = (await Product.findById(testProduct._id)).stock;
  console.log(`Stock before: ${stockBeforeReq} -> after req: ${stockAfterReq} -> after reject: ${stockAfterReject}`);
  if (stockAfterReject !== stockBeforeReq) {
    throw new Error(`Reserved stock was not released on exchange REJECTED! Expected ${stockBeforeReq}, got ${stockAfterReject}`);
  }
  console.log("✓ Reserved replacement stock was safely released back on REJECTED");

  console.log("\n====================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("====================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
