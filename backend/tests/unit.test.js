import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import Order from "../models/Order.js";
import Otp from "../models/Otp.js";
import { isRequestAdmin } from "../middleware/authMiddleware.js";
import { generateCardNumberForUser } from "../controllers/userController.js";
import { resolveSupportIssueType, createSupportRequest } from "../services/aiSupportService.js";

test("Order model accepts COD, CARD, UPI, NETBANKING, and PAYLATER payment methods", () => {
  const validMethods = ["COD", "CARD", "UPI", "NETBANKING", "PAYLATER"];
  for (const method of validMethods) {
    const order = new Order({
      user: "650000000000000000000001",
      orderItems: [
        {
          product: "650000000000000000000002",
          name: "Test Shoe",
          price: 999,
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: "Test",
        lastName: "User",
        houseBuilding: "10",
        streetLocality: "MG Road",
        cityState: "Bengaluru, Karnataka",
        pincode: "560001",
        mobile: "9999999999",
      },
      subtotal: 999,
      totalAmount: 999,
      paymentMethod: method,
    });
    const err = order.validateSync();
    assert.equal(err, undefined, `Expected ${method} to pass Order validation`);
  }
});

test("Order model rejects unsupported paymentMethod", () => {
  const order = new Order({
    user: "650000000000000000000001",
    orderItems: [],
    shippingAddress: {
      firstName: "Test",
      lastName: "User",
      houseBuilding: "10",
      streetLocality: "MG Road",
      cityState: "Bengaluru, Karnataka",
      pincode: "560001",
      mobile: "9999999999",
    },
    subtotal: 0,
    totalAmount: 0,
    paymentMethod: "CRYPTO_UNVERIFIED",
  });
  const err = order.validateSync();
  assert.ok(err?.errors?.paymentMethod, "Expected validation error for invalid paymentMethod");
});

test("Otp schema initializes attempts to 0", () => {
  const otp = new Otp({
    email: "user@example.com",
    otp: "123456",
    expiresAt: new Date(Date.now() + 60000),
  });
  assert.equal(otp.attempts, 0);
});

test("generateCardNumberForUser generates uniform 13-digit Decathlon card numbers", () => {
  const c1 = generateCardNumberForUser({ _id: "650000000000000000000001", email: "vk7184192@gmail.com" });
  const c2 = generateCardNumberForUser({ _id: "650000000000000000000001", email: "other@example.com" });
  assert.match(c1, /^2 \d{6} \d{6}$/);
  assert.equal(c1, c2, "Same user ID should derive deterministic card number regardless of email");
});

test("resolveSupportIssueType maps explicit types and category hints accurately", () => {
  assert.equal(resolveSupportIssueType("DELIVERY", "Orders"), "delivery");
  assert.equal(resolveSupportIssueType("", "Payments & UPI", "650000000000000000000001"), "payment");
  assert.equal(resolveSupportIssueType("", "Returns & Refunds"), "return");
  assert.equal(resolveSupportIssueType("", "Unknown Topic"), "other");
});

test("isRequestAdmin only accepts verified admin JWTs", () => {
  const prevSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-secret";
  try {
    const adminToken = jwt.sign({ id: "u1", role: "admin" }, process.env.JWT_SECRET);
    const customerToken = jwt.sign({ id: "u2", role: "customer" }, process.env.JWT_SECRET);
    const badToken = jwt.sign({ id: "u3", role: "admin" }, "wrong-secret");

    assert.equal(isRequestAdmin({ headers: {} }), false);
    assert.equal(isRequestAdmin({ headers: { authorization: `Bearer ${customerToken}` } }), false);
    assert.equal(isRequestAdmin({ headers: { authorization: `Bearer ${badToken}` } }), false);
    assert.equal(isRequestAdmin({ headers: { authorization: `Bearer ${adminToken}` } }), true);
  } finally {
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  }
});

test("createSupportRequest rejects unauthenticated or invalid orderId attachments", async () => {
  const invalidRes = await createSupportRequest("650000000000000000000001", {
    subject: "Order issue",
    message: "Help",
    orderId: "not-an-object-id",
  });
  assert.equal(invalidRes.success, false);
  assert.equal(invalidRes.statusCode, 400);

  const guestOrderRes = await createSupportRequest(null, {
    subject: "Order issue",
    message: "Help",
    guestEmail: "guest@example.com",
    orderId: "650000000000000000000099",
  });
  assert.equal(guestOrderRes.success, false);
  assert.equal(guestOrderRes.statusCode, 401);
});
