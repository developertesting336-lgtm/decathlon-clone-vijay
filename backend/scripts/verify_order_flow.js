import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Order from '../models/Order.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const BASE_URL = 'http://localhost:5000';
const TEST_ORDER_ID = '6ab5e8143a36bc3676478408';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiPut = async (url, body, token) => {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const apiGet = async (url, token) => {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

async function runTests() {
  console.log('====================================================');
  console.log('DECATHLON CLONE: 17-STEP ORDER FLOW VERIFICATION');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const adminUser = await User.findOne({ email: 'vijay@gmail.com' });
  const customerUser = await User.findOne({ email: 'developertesting336@gmail.com' });

  if (!adminUser || !customerUser) {
    throw new Error('Admin or Customer user not found in DB!');
  }
  console.log(`✓ Admin User: ${adminUser.name} (${adminUser.email})`);
  console.log(`✓ Customer User: ${customerUser.name} (${customerUser.email})\n`);

  const adminToken = jwt.sign(
    { id: adminUser._id, role: adminUser.role || 'admin' },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '1d' }
  );

  const customerToken = jwt.sign(
    { id: customerUser._id, role: 'customer' },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '1d' }
  );

  // STEP 1: Set order to OUT_FOR_DELIVERY (prepare clean state)
  console.log('--- Step 1: Setting test order to OUT_FOR_DELIVERY ---');
  await Order.findByIdAndUpdate(TEST_ORDER_ID, {
    orderStatus: 'out_for_delivery',
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    paidAt: null,
    paymentReceivedAt: null,
    deliveredAt: null,
    currentLocation: {
      city: 'Delhi Hub',
      latitude: 28.6139,
      longitude: 77.209,
    },
    trackingHistory: [
      {
        status: 'ORDER_PLACED',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2),
        location: 'Bengaluru',
        description: 'Order placed successfully',
      },
      {
        status: 'SHIPPED',
        timestamp: new Date(Date.now() - 3600000 * 24),
        location: 'Bengaluru Fulfillment Center',
        description: 'Dispatched from central warehouse',
      },
      {
        status: 'REACHED_HUB',
        timestamp: new Date(Date.now() - 3600000 * 12),
        location: 'Delhi Sorting Facility',
        description: 'Package arrived at regional facility',
      },
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: new Date(Date.now() - 3600000 * 2),
        location: 'Delhi Hub',
        description: 'Package out for delivery with courier',
      },
    ],
  });
  console.log(`✓ Order ${TEST_ORDER_ID} configured in OUT_FOR_DELIVERY state (COD pending)\n`);

  // STEP 2: Admin calls PUT /api/orders/:id/tracking to Mark as Delivered
  console.log('--- Step 2: Admin calls PUT /api/orders/:id/tracking to Mark as Delivered ---');
  const deliverRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/tracking`,
    {
      status: 'DELIVERED',
      location: {
        city: 'Delhi NCR',
        latitude: 28.6139,
        longitude: 77.209,
      },
      description: 'Order delivered successfully',
    },
    adminToken
  );

  console.log(`HTTP Status: ${deliverRes.status}`, deliverRes.data);
  if (deliverRes.status !== 200) {
    throw new Error(`Failed to mark order as delivered: ${JSON.stringify(deliverRes.data)}`);
  }
  await sleep(1000);

  // Fetch updated order from DB
  const deliveredOrder = await Order.findById(TEST_ORDER_ID);

  // STEP 3: Verify orderStatus = delivered
  console.log('\n--- Step 3: Verify orderStatus = delivered ---');
  if (deliveredOrder.orderStatus === 'delivered') {
    console.log(`✓ PASS: orderStatus is "${deliveredOrder.orderStatus}"`);
  } else {
    throw new Error(`FAIL: orderStatus expected "delivered" but got "${deliveredOrder.orderStatus}"`);
  }

  // STEP 4: Verify tracking status = DELIVERED
  console.log('\n--- Step 4: Verify tracking status = DELIVERED ---');
  const currentTrackingStatus =
    deliveredOrder.trackingHistory && deliveredOrder.trackingHistory.length > 0
      ? deliveredOrder.trackingHistory[deliveredOrder.trackingHistory.length - 1].status
      : null;

  if (currentTrackingStatus === 'DELIVERED') {
    console.log(`✓ PASS: latest tracking status is "${currentTrackingStatus}"`);
  } else {
    throw new Error(`FAIL: tracking status expected "DELIVERED" but got "${currentTrackingStatus}"`);
  }

  // STEP 5: Verify trackingHistory
  console.log('\n--- Step 5: Verify trackingHistory contains DELIVERED ---');
  const deliveredHistory = (deliveredOrder.trackingHistory || []).filter(
    (h) => h.status === 'DELIVERED'
  );
  if (deliveredHistory.length === 1) {
    console.log('✓ PASS: Exactly 1 DELIVERED entry in history:', deliveredHistory[0]);
  } else {
    throw new Error(`FAIL: Expected 1 DELIVERED entry in history, found ${deliveredHistory.length}`);
  }

  // STEP 6: Verify delivered timestamp
  console.log('\n--- Step 6: Verify delivered timestamp (deliveredAt) ---');
  if (deliveredOrder.deliveredAt && !isNaN(new Date(deliveredOrder.deliveredAt).getTime())) {
    console.log(`✓ PASS: deliveredAt timestamp is recorded: ${deliveredOrder.deliveredAt.toISOString()}`);
  } else {
    throw new Error(`FAIL: deliveredAt is missing or invalid: ${deliveredOrder.deliveredAt}`);
  }

  // STEP 7 & 8: Verify customer notification created in DB (with Title: "Order Delivered")
  console.log('\n--- Step 7 & 8: Verify customer persistent notification and push creation ---');
  const deliveryNotification = await Notification.findOne({
    recipient: customerUser._id,
    title: 'Order Delivered',
  }).sort({ createdAt: -1 });

  if (deliveryNotification) {
    console.log('✓ PASS: Persistent DB notification found:', {
      id: deliveryNotification._id,
      title: deliveryNotification.title,
      message: deliveryNotification.message,
      createdAt: deliveryNotification.createdAt,
    });
  } else {
    throw new Error('FAIL: Order Delivered notification was not created in DB');
  }

  // STEP 9: If COD, verify paymentStatus remains pending
  console.log('\n--- Step 9: Verify COD paymentStatus remains pending after delivery ---');
  if (deliveredOrder.paymentMethod === 'COD' && deliveredOrder.paymentStatus === 'pending') {
    console.log(`✓ PASS: paymentMethod = ${deliveredOrder.paymentMethod}, paymentStatus remains "${deliveredOrder.paymentStatus}"`);
  } else {
    throw new Error(`FAIL: paymentStatus was altered prematurely: ${deliveredOrder.paymentStatus}`);
  }

  // STEP 10: Admin clicks Mark COD Payment Received (PUT /api/orders/:id/payment-status)
  console.log('\n--- Step 10: Admin calls PUT /api/orders/:id/payment-status to mark COD payment received ---');
  const codPayRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/payment-status`,
    { paymentStatus: 'paid' },
    adminToken
  );

  console.log(`HTTP Status: ${codPayRes.status}`, codPayRes.data);
  if (codPayRes.status !== 200) {
    throw new Error(`Failed to mark COD payment received: ${JSON.stringify(codPayRes.data)}`);
  }
  await sleep(1000);

  const paidOrder = await Order.findById(TEST_ORDER_ID);

  // STEP 11: Verify paymentStatus = paid
  console.log('\n--- Step 11: Verify paymentStatus = paid ---');
  if (paidOrder.paymentStatus === 'paid') {
    console.log(`✓ PASS: paymentStatus is "${paidOrder.paymentStatus}"`);
  } else {
    throw new Error(`FAIL: paymentStatus expected "paid" but got "${paidOrder.paymentStatus}"`);
  }

  // STEP 12: Verify payment received timestamp
  console.log('\n--- Step 12: Verify payment received timestamp ---');
  if (paidOrder.paymentReceivedAt && paidOrder.paidAt) {
    console.log(`✓ PASS: paymentReceivedAt: ${paidOrder.paymentReceivedAt.toISOString()}`);
    console.log(`✓ PASS: paidAt: ${paidOrder.paidAt.toISOString()}`);
  } else {
    throw new Error(`FAIL: paymentReceivedAt (${paidOrder.paymentReceivedAt}) or paidAt (${paidOrder.paidAt}) missing`);
  }

  // STEP 13: Verify customer notification for COD payment confirmation
  console.log('\n--- Step 13: Verify customer notification for COD payment confirmation ---');
  const codNotification = await Notification.findOne({
    recipient: customerUser._id,
    title: 'COD Payment Confirmed',
  }).sort({ createdAt: -1 });

  if (codNotification) {
    console.log('✓ PASS: COD Payment Confirmed notification found:', {
      id: codNotification._id,
      title: codNotification.title,
      message: codNotification.message,
      createdAt: codNotification.createdAt,
    });
  } else {
    throw new Error('FAIL: COD Payment Confirmed notification was not created in DB');
  }

  // STEP 14: Try marking COD payment again and verify it is rejected
  console.log('\n--- Step 14: Try marking COD payment again (verify duplicate rejection) ---');
  const duplicatePayRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/payment-status`,
    { paymentStatus: 'paid' },
    adminToken
  );

  console.log(`HTTP Status: ${duplicatePayRes.status}`, duplicatePayRes.data);
  if (duplicatePayRes.status === 400) {
    console.log(`✓ PASS: Duplicate COD payment confirmation rejected with HTTP 400: "${duplicatePayRes.data.message}"`);
  } else {
    throw new Error(`FAIL: Expected HTTP 400 for duplicate COD payment confirmation, got ${duplicatePayRes.status}`);
  }

  // STEP 15: Try customer access to admin endpoints and verify authorization failure
  console.log('\n--- Step 15: Try customer access to admin endpoints (verify 403 Forbidden) ---');
  const custTrackingRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/tracking`,
    { status: 'DELIVERED' },
    customerToken
  );
  if (custTrackingRes.status === 403 || custTrackingRes.status === 401) {
    console.log(`✓ PASS: Customer blocked from tracking endpoint with HTTP ${custTrackingRes.status}: "${custTrackingRes.data.message}"`);
  } else {
    throw new Error(`FAIL: Expected HTTP 403/401 for customer on tracking endpoint, got ${custTrackingRes.status}`);
  }

  const custPaymentRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/payment-status`,
    { paymentStatus: 'paid' },
    customerToken
  );
  if (custPaymentRes.status === 403 || custPaymentRes.status === 401) {
    console.log(`✓ PASS: Customer blocked from payment-status endpoint with HTTP ${custPaymentRes.status}: "${custPaymentRes.data.message}"`);
  } else {
    throw new Error(`FAIL: Expected HTTP 403/401 for customer on payment-status endpoint, got ${custPaymentRes.status}`);
  }

  // STEP 16: Verify Stripe/Card orders are not affected by COD payment logic
  console.log('\n--- Step 16: Verify Stripe orders are rejected by COD payment endpoint ---');
  const stripeOrder = new Order({
    user: customerUser._id,
    orderItems: [
      {
        product: new mongoose.Types.ObjectId(),
        name: 'Stripe Test Item',
        quantity: 1,
        price: 999,
        image: 'test.jpg',
      },
    ],
    shippingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      mobile: '9876543210',
      houseBuilding: '123',
      streetLocality: 'Stripe Street',
      pincode: '400001',
      cityState: 'Mumbai, Maharashtra',
      addressType: 'Home',
    },
    subtotal: 999,
    deliveryCharge: 0,
    totalAmount: 999,
    paymentMethod: 'CARD',
    paymentStatus: 'pending',
    stripePaymentIntentId: 'pi_test_123456789',
  });
  await stripeOrder.save();

  try {
    const cardPayRes = await apiPut(
      `${BASE_URL}/api/orders/${stripeOrder._id}/payment-status`,
      { paymentStatus: 'paid' },
      adminToken
    );
    console.log(`HTTP Status: ${cardPayRes.status}`, cardPayRes.data);
    if (cardPayRes.status === 400) {
      console.log(`✓ PASS: Non-COD order payment update rejected with HTTP 400: "${cardPayRes.data.message}"`);
    } else {
      throw new Error(`FAIL: Expected HTTP 400 for Card/Stripe order on COD endpoint, got ${cardPayRes.status}`);
    }
  } finally {
    await Order.findByIdAndDelete(stripeOrder._id);
  }

  // STEP 17: Verify duplicate DELIVERED tracking history is not created
  console.log('\n--- Step 17: Verify duplicate DELIVERED tracking history is not created ---');
  const dupDeliverRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/tracking`,
    {
      status: 'DELIVERED',
      location: { city: 'Delhi' },
      description: 'Second delivery attempt',
    },
    adminToken
  );
  console.log(`HTTP Status: ${dupDeliverRes.status}`, dupDeliverRes.data);

  const finalCheckOrder = await Order.findById(TEST_ORDER_ID);
  const deliveredCount = (finalCheckOrder.trackingHistory || []).filter(
    (h) => h.status === 'DELIVERED'
  ).length;

  if (deliveredCount === 1) {
    console.log(`✓ PASS: Duplicate DELIVERED history entries prevented (count = ${deliveredCount})`);
  } else {
    throw new Error(`FAIL: Expected exactly 1 DELIVERED history entry, found ${deliveredCount}`);
  }

  // BONUS: Verify invalid progression such as SHIPPED -> DELIVERED is rejected
  console.log('\n--- Bonus Test: Verify invalid progression SHIPPED -> DELIVERED is rejected ---');
  await Order.findByIdAndUpdate(TEST_ORDER_ID, {
    trackingHistory: [
      {
        status: 'SHIPPED',
        location: 'Delhi Warehouse',
        description: 'Shipped',
        timestamp: new Date(),
      },
    ],
    orderStatus: 'shipped',
  });
  const invalidProgRes = await apiPut(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/tracking`,
    {
      status: 'DELIVERED',
      location: { city: 'Delhi' },
    },
    adminToken
  );
  console.log(`HTTP Status: ${invalidProgRes.status}`, invalidProgRes.data);
  if (invalidProgRes.status === 400) {
    console.log(`✓ PASS: Invalid progression SHIPPED -> DELIVERED rejected with HTTP 400: "${invalidProgRes.data.message}"`);
  } else {
    throw new Error(`FAIL: Invalid progression SHIPPED -> DELIVERED was unexpectedly accepted with HTTP ${invalidProgRes.status}`);
  }

  // BONUS 2: Verify Customer Tracking API (GET /api/orders/:id/tracking) returns delivered timestamps and COD info
  console.log('\n--- Bonus Test 2: Verify GET /api/orders/:id/tracking response ---');
  await Order.findByIdAndUpdate(TEST_ORDER_ID, {
    orderStatus: 'delivered',
    deliveredAt: new Date(),
    paymentStatus: 'paid',
    paymentReceivedAt: new Date(),
    paidAt: new Date(),
    trackingHistory: [
      { status: 'ORDER_PLACED', timestamp: new Date(Date.now() - 3600000 * 48), location: 'Bengaluru', description: 'Order placed' },
      { status: 'SHIPPED', timestamp: new Date(Date.now() - 3600000 * 24), location: 'Bengaluru FC', description: 'Dispatched' },
      { status: 'REACHED_HUB', timestamp: new Date(Date.now() - 3600000 * 12), location: 'Delhi Hub', description: 'Reached hub' },
      { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 3600000 * 2), location: 'Delhi', description: 'Out for delivery' },
      { status: 'DELIVERED', timestamp: new Date(), location: 'Delhi', description: 'Delivered' }
    ]
  });
  const customerTrackGet = await apiGet(
    `${BASE_URL}/api/orders/${TEST_ORDER_ID}/tracking`,
    customerToken
  );
  console.log(`HTTP Status: ${customerTrackGet.status}`);
  const trackingObj = customerTrackGet.data.tracking || customerTrackGet.data;
  console.log('Tracking Payload keys:', Object.keys(trackingObj));
  if (
    trackingObj.status === 'DELIVERED' &&
    trackingObj.paymentStatus === 'paid' &&
    trackingObj.deliveredAt
  ) {
    console.log('✓ PASS: Customer tracking API returns complete tracking, delivery, and payment information.');
  } else {
    throw new Error(`FAIL: Customer tracking API missing expected fields: ${JSON.stringify(trackingObj)}`);
  }

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('🎉 ALL 17 TESTS + BONUS CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err.message);
  process.exit(1);
});
