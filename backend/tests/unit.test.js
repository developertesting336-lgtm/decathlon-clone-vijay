import test from "node:test";
import assert from "node:assert/strict";
import Order from "../models/Order.js";
import Otp from "../models/Otp.js";
import { generateCardNumberForUser } from "../controllers/userController.js";

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
