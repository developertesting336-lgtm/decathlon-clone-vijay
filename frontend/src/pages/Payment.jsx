import React, { useCallback, useEffect, useState, useRef } from "react";

import {
  FiCheckCircle,
  FiTruck,
  FiAward,
  FiHome,
} from "react-icons/fi";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { loadStripe } from "@stripe/stripe-js";

import api from "../api/axios";
import toast from "react-hot-toast";

import "../styles/Payment.css";

const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

/* =====================================================
   AUTH
===================================================== */

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

/* =====================================================
   PRICE
===================================================== */

const formatPrice = (price) => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

/* =====================================================
   STRIPE PAYMENT FORM
===================================================== */

const StripePaymentForm = ({
  order,
  clientSecret,
  selectedMethod,
  selectedUpiApp,
  vpaId,
  upiOption,
  selectedBank,
  selectedPayLater,
  payLaterMobile,
  onClose,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [simulatedStep, setSimulatedStep] = useState(1);

  const handleStripeReady = () => {
    console.log("Stripe PaymentElement mounted");
    setStripeReady(true);
  };

  const handleStripeLoadError = (event) => {
    console.error("Stripe PaymentElement Load Error:", event?.error);
    setStripeReady(false);
    setErrorMessage(event?.error?.message || "Unable to load payment form");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (selectedMethod === "card") {
      if (!stripe) {
        toast.error("Stripe is not ready");
        return;
      }
      if (!elements) {
        toast.error("Stripe Elements is not ready");
        return;
      }
      if (!stripeReady) {
        toast.error("Payment form is still loading");
        return;
      }

      try {
        setProcessing(true);
        setErrorMessage("");

        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment/${order._id}`,
          },
          redirect: "if_required",
        });

        if (result.error) {
          console.error("Stripe Payment Error:", result.error);
          const message = result.error.message || "Payment failed";
          setErrorMessage(message);
          toast.error(message);
          return;
        }

        const paymentIntent = result.paymentIntent;
        if (!paymentIntent?.id) {
          toast.error("Payment Intent was not returned");
          return;
        }

        const response = await api.post(
          "/payment/verify-payment",
          {
            paymentIntentId: paymentIntent.id,
            orderId: order._id,
          },
          getAuthConfig(),
        );

        if (response.data?.paymentStatus === "paid") {
          toast.success("Payment successful");
          onSuccess(response.data?.order?._id || order._id);
          return;
        }

        toast.error(response.data?.message || "Payment verification failed");
      } catch (error) {
        console.error("Stripe Payment Exception:", error);
        const message =
          error.response?.data?.message || error.message || "Payment failed";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setProcessing(false);
      }
    } else if (selectedMethod === "upi") {
      // REAL STRIPE TEST MODE UPI PAYMENT FLOW
      if (!stripe) {
        toast.error("Stripe is still loading. Please wait.");
        return;
      }

      if (!clientSecret) {
        toast.error("Stripe payment session is missing. Please close and retry.");
        return;
      }

      try {
        setProcessing(true);
        setErrorMessage("");
        setSimulatedStep(1); // 1. Sending Request

        const customerName =
          `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim() ||
          "Decathlon Customer";

        const line1 =
          order.shippingAddress?.houseBuilding
            ? `${order.shippingAddress.houseBuilding}, ${order.shippingAddress?.streetLocality || ""}`.trim()
            : order.shippingAddress?.streetLocality || "Main Address";

        const cityStateParts = (order.shippingAddress?.cityState || "").split(",");
        const city = cityStateParts[0]?.trim() || "Bengaluru";
        const state = cityStateParts[1]?.trim() || "Karnataka";
        const postalCode = order.shippingAddress?.pincode || "560001";

        // Progress to confirming state
        setSimulatedStep(2); // 2. Confirming Payment

        // Confirm UPI payment using real Stripe test mode flow
        const result = await stripe.confirmPayment({
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/payment/${order._id}`,
            payment_method_data: {
              type: "upi",
              billing_details: {
                name: customerName,
                address: {
                  line1: line1,
                  city: city,
                  state: state,
                  postal_code: postalCode,
                  country: "IN",
                },
              },
            },
          },
        });

        // If Stripe returns an error immediately
        if (result?.error) {
          console.error("Stripe UPI Error:", result.error);
          const message = result.error.message || "UPI payment failed";
          setErrorMessage(message);
          toast.error(message);
          setProcessing(false);
          setSimulatedStep(1);
          return;
        }

        // Stripe will automatically redirect the user to Stripe's hosted UPI instructions
        // (with test QR code and 'Simulate scan' / test authorization buttons).
        // If Stripe does not redirect, verify status directly:
        if (result?.paymentIntent?.status === "succeeded") {
          const response = await api.post(
            "/payment/verify-payment",
            {
              paymentIntentId: result.paymentIntent.id,
              orderId: order._id,
            },
            getAuthConfig(),
          );

          if (response.data?.paymentStatus === "paid") {
            toast.success("UPI payment successful!");
            onSuccess(response.data?.order?._id || order._id);
            return;
          }
        }
      } catch (error) {
        console.error("Stripe UPI Exception:", error);
        const message =
          error.response?.data?.message ||
          error.message ||
          "Failed to initiate UPI payment";
        setErrorMessage(message);
        toast.error(message);
        setProcessing(false);
        setSimulatedStep(1);
      }
    } else {
      // NON-STRIPE METHODS (Netbanking, PayLater)
      try {
        setProcessing(true);
        setSimulatedStep(2);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Confirm order payment on backend
        const response = await api.put(
          `/orders/${order._id}/confirm-online`,
          { paymentMethod: selectedMethod.toUpperCase() },
          getAuthConfig(),
        );

        const confirmedOrder = response.data?.order || order;
        toast.success(`${selectedMethod.toUpperCase()} Payment successful!`);
        onSuccess(confirmedOrder._id || order._id);
      } catch (error) {
        console.error("Alternative Payment Error:", error);
        toast.error(error.response?.data?.message || "Payment processing failed");
      } finally {
        setProcessing(false);
      }
    }
  };

  const getMethodTitle = () => {
    switch (selectedMethod) {
      case "upi": {
        const appMap = {
          gpay: "GPAY",
          phonepe: "PHONEPE",
          paytm: "PAYTM",
          bhim: "BHIM",
        };
        const appName =
          upiOption === "apps"
            ? appMap[selectedUpiApp] || "GPAY"
            : vpaId || "VPA";
        return `UPI (${appName})`;
      }
      case "netbanking":
        return `Netbanking (${(selectedBank || "Bank").toUpperCase()})`;
      case "paylater":
        return `Pay Later (${selectedPayLater.toUpperCase()})`;
      default:
        return "Credit / Debit Card";
    }
  };

  const getUpiDisplayName = () => {
    if (upiOption === "apps") {
      if (selectedUpiApp === "gpay") return "GPAY";
      if (selectedUpiApp === "phonepe") return "PHONEPE";
      if (selectedUpiApp === "paytm") return "PAYTM";
      if (selectedUpiApp === "bhim") return "BHIM UPI";
      return selectedUpiApp.toUpperCase();
    }
    return "UPI VPA";
  };

  return (
    <div className="stripe-modal-overlay">
      <div className="stripe-payment-modal">
        <div className="stripe-modal-header">
          <div>
            <h2>Complete Payment - {getMethodTitle()}</h2>
            <span>Order #{order._id.slice(-8)}</span>
          </div>

          <button
            type="button"
            className="stripe-close-btn"
            onClick={onClose}
            disabled={processing}
          >
            ×
          </button>
        </div>

        <div className="stripe-modal-body">
          <div className="stripe-payment-total">
            <span>Amount to pay</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>

          <form className="stripe-payment-form" onSubmit={handleSubmit}>
            {selectedMethod === "card" ? (
              <div className="stripe-element-wrapper">
                {!stripeReady && (
                  <div className="stripe-element-loading">
                    Loading secure payment form...
                  </div>
                )}
                <PaymentElement
                  onReady={handleStripeReady}
                  onLoadError={handleStripeLoadError}
                />
              </div>
            ) : selectedMethod === "upi" ? (
              <div className="custom-modal-panel">
                <div className="modal-method-icon upi-icon">📲</div>
                <h4>Paying via {getUpiDisplayName()}</h4>
                {upiOption === "vpa" && (
                  <p className="vpa-display">
                    ID: <strong>{vpaId || "user@upi"}</strong>
                  </p>
                )}

                <div className="upi-progress-box">
                  <div
                    className={`step-dot ${simulatedStep >= 1 ? "done" : ""}`}
                  >
                    1. Sending Request
                  </div>
                  <div className="step-line" />
                  <div
                    className={`step-dot ${simulatedStep >= 2 ? "done" : ""}`}
                  >
                    2. Confirming Payment
                  </div>
                </div>

                <p className="modal-help-text">
                  {processing
                    ? "Connecting to Stripe Test Mode UPI simulator... Please wait."
                    : "Click below to proceed to Stripe Test Mode UPI authorization."}
                </p>
              </div>
            ) : selectedMethod === "netbanking" ? (
              <div className="custom-modal-panel">
                <div className="modal-method-icon bank-icon">🏦</div>
                <h4>
                  Paying via {(selectedBank || "Bank").toUpperCase()} Netbanking
                </h4>
                <p className="modal-help-text">
                  You are being redirected to your bank's portal. Please do not
                  close or refresh this window.
                </p>
              </div>
            ) : (
              <div className="custom-modal-panel">
                <div className="modal-method-icon paylater-icon">💳</div>
                <h4>Paying via {selectedPayLater.toUpperCase()} Pay Later</h4>
                {payLaterMobile && (
                  <p className="mobile-display">
                    Mobile: <strong>+91 {payLaterMobile}</strong>
                  </p>
                )}
                <p className="modal-help-text">
                  Instant credit limit verified. Click below to complete checkout.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="stripe-payment-error">{errorMessage}</div>
            )}

            <button
              type="submit"
              className="stripe-submit-btn"
              disabled={
                selectedMethod === "card"
                  ? !stripe || !elements || !stripeReady || processing
                  : selectedMethod === "upi"
                    ? !stripe || processing
                    : processing
              }
            >
              {processing
                ? "PROCESSING PAYMENT..."
                : `PAY ${formatPrice(order.totalAmount)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
/* =====================================================
   PAYMENT PAGE
===================================================== */

const Payment = () => {
  const navigate = useNavigate();

  const { orderId } = useParams();

  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);

  const [selectedMethod, setSelectedMethod] = useState("upi");

  // UPI State
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiOption, setUpiOption] = useState("apps"); // 'apps' | 'vpa'
  const [vpaId, setVpaId] = useState("");

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState("hdfc");

  // PayLater State
  const [selectedPayLater, setSelectedPayLater] = useState("simpl");
  const [payLaterMobile, setPayLaterMobile] = useState("");

  const [loading, setLoading] = useState(true);

  const [paymentLoading, setPaymentLoading] = useState(false);

  const [creatingIntent, setCreatingIntent] = useState(false);

  const [clientSecret, setClientSecret] = useState("");

  const [showStripe, setShowStripe] = useState(false);

  const [rewardEnabled, setRewardEnabled] = useState(false);

  const rewardBalance = 0;

  const hasVerifiedRedirectRef = useRef(false);

  /* =====================================================
     FETCH ORDER
  ===================================================== */

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      toast.error("Order ID is missing");

      navigate("/cart");

      return;
    }

    try {
      setLoading(true);

      const response = await api.get(`/orders/${orderId}`, getAuthConfig());

      const orderData = response.data?.order;

      if (!orderData) {
        toast.error("Order not found");

        navigate("/cart");

        return;
      }

      setOrder(orderData);
    } catch (error) {
      console.error("Fetch Order Error:", error);

      if (error.response?.status === 401) {
        toast.error("Please login first");

        navigate("/login");

        return;
      }

      toast.error(error.response?.data?.message || "Failed to load order");

      navigate("/cart");
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* =====================================================
     VERIFY REDIRECT PAYMENT
  ===================================================== */

  const verifyRedirectPayment = useCallback(async () => {
    const paymentIntentClientSecret = searchParams.get(
      "payment_intent_client_secret",
    );

    const paymentIntentId = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (!paymentIntentClientSecret || !paymentIntentId || !orderId) {
      return;
    }

    if (hasVerifiedRedirectRef.current) {
      return;
    }
    hasVerifiedRedirectRef.current = true;

    if (!stripePromise) {
      toast.error("Stripe publishable key is missing");
      return;
    }

    try {
      setLoading(true);

      const stripe = await stripePromise;

      if (!stripe) {
        toast.error("Stripe failed to load");
        return;
      }

      const result = await stripe.retrievePaymentIntent(
        paymentIntentClientSecret,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      const paymentIntent = result.paymentIntent;

      if (!paymentIntent) {
        toast.error("Payment details not found");
        navigate(`/payment/${orderId}`, { replace: true });
        return;
      }

      // Check if the user declined or failed the test payment in Stripe
      if (
        paymentIntent.status === "requires_payment_method" ||
        paymentIntent.status === "canceled" ||
        redirectStatus === "failed"
      ) {
        toast.error("Payment was declined or cancelled. You can try again.");
        navigate(`/payment/${orderId}`, { replace: true });
        return;
      }

      const response = await api.post(
        "/payment/verify-payment",
        {
          paymentIntentId: paymentIntent.id,

          orderId,
        },
        getAuthConfig(),
      );

      if (response.data?.paymentStatus === "paid") {
        toast.success("Payment verified successfully!", {
          id: "payment-verified-success",
        });
        navigate(`/order-success/${orderId}`, {
          replace: true,
        });
      } else {
        toast.error(
          response.data?.message || `Payment status: ${paymentIntent.status}`,
        );
        navigate(`/payment/${orderId}`, { replace: true });
      }
    } catch (error) {
      console.error("Redirect Verification Error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Payment verification failed",
      );
      navigate(`/payment/${orderId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [searchParams, orderId, navigate]);

  useEffect(() => {
    verifyRedirectPayment();
  }, [verifyRedirectPayment]);

  /* =====================================================
     START ONLINE PAYMENT
  ===================================================== */

  const startOnlinePayment = async () => {
    if (!order?._id) {
      toast.error("Order not found");

      return;
    }

    if (!stripePromise) {
      toast.error("Stripe is not configured");

      console.error("REACT_APP_STRIPE_PUBLISHABLE_KEY is missing");

      return;
    }

    if (order.paymentStatus === "paid") {
      toast.success("Order is already paid");

      return;
    }

    if (order.orderStatus === "cancelled") {
      toast.error("This order is cancelled");

      return;
    }

    try {
      setCreatingIntent(true);

      /*
       * Clear old Stripe state before
       * creating a new PaymentIntent.
       */
      setShowStripe(false);
      setClientSecret("");

      const paymentMethod = selectedMethod === "upi" ? "UPI" : "CARD";

      const response = await api.post(
        "/payment/create-payment-intent",
        {
          orderId: order._id,

          paymentMethod,
        },
        getAuthConfig(),
      );

      console.log("Create PaymentIntent:", response.data);

      const secret = response.data?.clientSecret;

      if (!secret || typeof secret !== "string") {
        toast.error("Client secret was not received");

        console.error("Invalid clientSecret:", response.data);

        return;
      }

      /*
       * Set secret first.
       */
      setClientSecret(secret);

      /*
       * Then open Stripe.
       */
      setShowStripe(true);
    } catch (error) {
      console.error("Create Payment Intent Error:", error);

      if (error.response?.status === 401) {
        toast.error("Please login first");

        navigate("/login");

        return;
      }

      toast.error(error.response?.data?.message || "Unable to start payment");
    } finally {
      setCreatingIntent(false);
    }
  };

  /* =====================================================
     COD
  ===================================================== */

  const handleCOD = async () => {
    if (!order?._id) {
      toast.error("Order not found");

      return;
    }

    if (order.paymentStatus === "paid") {
      toast.error("Order is already paid");

      return;
    }

    if (order.orderStatus === "cancelled") {
      toast.error("This order is cancelled");

      return;
    }

    try {
      setPaymentLoading(true);

      const response = await api.put(
        `/orders/${order._id}/cod`,
        {},
        getAuthConfig(),
      );

      const confirmedOrder = response.data?.order;

      if (!confirmedOrder?._id) {
        toast.error("Failed to confirm order");

        return;
      }

      toast.success("COD order placed successfully");

      navigate(`/order-success/${confirmedOrder._id}`);
    } catch (error) {
      console.error("COD Error:", error);

      if (error.response?.status === 401) {
        toast.error("Please login first");

        navigate("/login");

        return;
      }

      toast.error(error.response?.data?.message || "Failed to place COD order");
    } finally {
      setPaymentLoading(false);
    }
  };

  /* =====================================================
     PAYMENT SUCCESS
  ===================================================== */

  const handlePaymentSuccess = (successOrderId) => {
    setShowStripe(false);
    setClientSecret("");

    navigate(`/order-success/${successOrderId}`);
  };

  /* =====================================================
     ORDER DATA
  ===================================================== */

  const orderItems = order?.orderItems || [];

  const subtotal = Number(order?.subtotal || 0);

  const discount = Number(order?.discount || 0);

  const deliveryCharge = Number(order?.deliveryCharge || 0);

  const totalAmount = Number(order?.totalAmount || 0);

  const totalMRP = subtotal + discount;

  const pincode = order?.shippingAddress?.pincode || "";

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return <div className="payment-loading">Loading...</div>;
  }

  if (!order) {
    return null;
  }

  return (
    <>
      <main className="payment-page">
        {/* HEADER */}

        <header className="payment-header">
          <Link to="/" className="payment-logo">
            <span>D</span>

            <strong>DECATHLON</strong>
          </Link>

          <div className="secure-payment">
            <FiCheckCircle />

            <div>
              <strong>100%</strong>

              <span>Secure</span>

              <span>Payment</span>
            </div>
          </div>
        </header>

        {/* MAIN */}

        <div className="payment-container">
          {/* LEFT */}

          <section className="payment-left">
            <div className="gift-card-section">
              <div className="gift-card-box">
                <h2>Have a Gift Card?</h2>

                <p>Have a Gift Card? Add to this transaction</p>

                <button
                  type="button"
                  onClick={() => toast.info("Gift card coming soon")}
                >
                  <span>＋</span>
                  ADD A GIFT CARD
                </button>

                <div className="gift-links">
                  <span>Wallet & Gift card</span>

                  <a href="#terms">Terms & Conditions</a>
                </div>
              </div>
            </div>

            <h2 className="payment-method-title">
              Pay with other payment methods
            </h2>

            <div className="payment-methods">
              {/* SIDEBAR */}

              <div className="payment-method-sidebar">
                <button
                  type="button"
                  className={
                    selectedMethod === "upi"
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() => setSelectedMethod("upi")}
                >
                  <strong>UPI</strong>

                  <span>Instant payment using UPI app</span>
                </button>

                <button
                  type="button"
                  className={
                    selectedMethod === "card"
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() => setSelectedMethod("card")}
                >
                  <strong>CREDIT/DEBIT CARDS</strong>

                  <span>Visa, MasterCard, RuPay & More</span>
                </button>

                <button
                  type="button"
                  className={
                    selectedMethod === "paylater"
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() => setSelectedMethod("paylater")}
                >
                  <strong>BUY NOW PAY LATER</strong>

                  <span>Interest Free Monthly Installments</span>
                </button>

                <button
                  type="button"
                  className={
                    selectedMethod === "netbanking"
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() => setSelectedMethod("netbanking")}
                >
                  <strong>NETBANKING</strong>

                  <span>All Indian Banks</span>
                </button>

                <button
                  type="button"
                  className={
                    selectedMethod === "cod"
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() => setSelectedMethod("cod")}
                >
                  <strong>PAY ON DELIVERY</strong>

                  <span>UPI / Card on doorstep</span>
                </button>
              </div>

              {/* CONTENT */}

              <div className="payment-method-content">
                {/* UPI PANEL */}
                {selectedMethod === "upi" && (
                  <div className="payment-content-panel">
                    <h3>PAY USING UPI</h3>
                    <p>Select your preferred UPI App or enter your UPI VPA ID</p>

                    <div className="upi-options-tabs">
                      <button
                        type="button"
                        className={`upi-tab-btn ${upiOption === "apps" ? "active" : ""}`}
                        onClick={() => setUpiOption("apps")}
                      >
                        UPI Apps
                      </button>
                      <button
                        type="button"
                        className={`upi-tab-btn ${upiOption === "vpa" ? "active" : ""}`}
                        onClick={() => setUpiOption("vpa")}
                      >
                        UPI ID / VPA
                      </button>
                    </div>

                    {upiOption === "apps" ? (
                      <div className="upi-apps-grid">
                        {[
                          { id: "gpay", name: "Google Pay", color: "#4285f4", logo: "GPay" },
                          { id: "phonepe", name: "PhonePe", color: "#5f259f", logo: "Pe" },
                          { id: "paytm", name: "Paytm", color: "#00b9f5", logo: "Paytm" },
                          { id: "bhim", name: "BHIM UPI", color: "#f26522", logo: "BHIM" },
                        ].map((app) => (
                          <div
                            key={app.id}
                            className={`upi-app-card ${selectedUpiApp === app.id ? "selected" : ""}`}
                            onClick={() => setSelectedUpiApp(app.id)}
                          >
                            <div className="upi-app-logo" style={{ color: app.color }}>
                              {app.logo}
                            </div>
                            <div className="upi-app-name">{app.name}</div>
                            <div className="upi-radio-dot">
                              {selectedUpiApp === app.id && <div className="inner-dot" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="vpa-input-container">
                        <label>Enter VPA / UPI ID</label>
                        <div className="vpa-input-box">
                          <input
                            type="text"
                            placeholder="e.g. mobile@upi or name@okhdfcbank"
                            value={vpaId}
                            onChange={(e) => setVpaId(e.target.value)}
                          />
                        </div>
                        <small>A payment request will be sent to your UPI app.</small>
                      </div>
                    )}

                    <button
                      type="button"
                      className="method-pay-btn"
                      onClick={startOnlinePayment}
                      disabled={creatingIntent}
                    >
                      {creatingIntent
                        ? "PREPARING..."
                        : `PAY ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                )}

                {/* CREDIT / DEBIT CARD PANEL */}
                {selectedMethod === "card" && (
                  <div className="payment-content-panel">
                    <h3>CREDIT / DEBIT CARD</h3>
                    <p>Visa, MasterCard, RuPay, Maestro &amp; American Express accepted</p>

                    <div className="card-logos-row">
                      <span className="card-badge visa">VISA</span>
                      <span className="card-badge mc">MasterCard</span>
                      <span className="card-badge rupay">RuPay</span>
                      <span className="card-badge amex">AMEX</span>
                    </div>

                    <div className="card-security-note">
                      🔒 Payments are 256-bit SSL encrypted &amp; PCI-DSS compliant.
                    </div>

                    <button
                      type="button"
                      className="method-pay-btn"
                      onClick={startOnlinePayment}
                      disabled={creatingIntent}
                    >
                      {creatingIntent
                        ? "PREPARING..."
                        : `ENTER CARD DETAILS & PAY ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                )}

                {/* BUY NOW PAY LATER PANEL */}
                {selectedMethod === "paylater" && (
                  <div className="payment-content-panel">
                    <h3>BUY NOW PAY LATER</h3>
                    <p>Get instant credit with zero interest &amp; pay later</p>

                    <div className="paylater-providers-list">
                      {[
                        { id: "simpl", name: "Simpl Pay Later", desc: "1-Click Checkout with 0% interest" },
                        { id: "lazypay", name: "LazyPay", desc: "Pay in 15 days or easy monthly EMIs" },
                        { id: "zest", name: "Axio / ZestMoney", desc: "Pay in 3 interest-free installments" },
                      ].map((provider) => (
                        <div
                          key={provider.id}
                          className={`paylater-provider-card ${selectedPayLater === provider.id ? "selected" : ""}`}
                          onClick={() => setSelectedPayLater(provider.id)}
                        >
                          <div className="provider-info">
                            <strong>{provider.name}</strong>
                            <span>{provider.desc}</span>
                          </div>
                          <div className="upi-radio-dot">
                            {selectedPayLater === provider.id && <div className="inner-dot" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="paylater-mobile-box">
                      <label>Enter Registered Mobile Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10 digit mobile number"
                        value={payLaterMobile}
                        onChange={(e) => setPayLaterMobile(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="method-pay-btn"
                      onClick={startOnlinePayment}
                      disabled={creatingIntent}
                    >
                      {creatingIntent
                        ? "PREPARING..."
                        : `PAY VIA PAY LATER ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                )}

                {/* NETBANKING PANEL */}
                {selectedMethod === "netbanking" && (
                  <div className="payment-content-panel">
                    <h3>NETBANKING</h3>
                    <p>Select your bank to proceed with netbanking</p>

                    <div className="bank-grid">
                      {[
                        { id: "hdfc", name: "HDFC Bank", cls: "hdfc" },
                        { id: "icici", name: "ICICI Bank", cls: "icici" },
                        { id: "sbi", name: "State Bank of India", cls: "sbi" },
                        { id: "axis", name: "Axis Bank", cls: "axis" },
                        { id: "kotak", name: "Kotak Bank", cls: "kotak" },
                        { id: "pnb", name: "Punjab National Bank", cls: "hdfc" },
                      ].map((bank) => (
                        <button
                          type="button"
                          key={bank.id}
                          className={`bank-item ${selectedBank === bank.id ? "selected" : ""}`}
                          onClick={() => setSelectedBank(bank.id)}
                        >
                          <div className={`bank-logo ${bank.cls}`}>
                            {bank.name.charAt(0)}
                          </div>
                          <span>{bank.name}</span>
                        </button>
                      ))}
                    </div>

                    <select
                      className="other-bank"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                    >
                      <option value="">Select Other Indian Bank</option>
                      <option value="baroda">Bank of Baroda</option>
                      <option value="canara">Canara Bank</option>
                      <option value="union">Union Bank of India</option>
                      <option value="idbi">IDBI Bank</option>
                      <option value="yes">YES Bank</option>
                      <option value="indusind">IndusInd Bank</option>
                      <option value="federal">Federal Bank</option>
                    </select>

                    <div className="bank-note">
                      You will be redirected to your bank's secure netbanking portal.
                    </div>

                    <button
                      type="button"
                      className="method-pay-btn"
                      onClick={startOnlinePayment}
                      disabled={creatingIntent}
                    >
                      {creatingIntent
                        ? "PREPARING..."
                        : `PAY VIA NETBANKING ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                )}

                {/* PAY ON DELIVERY (COD) PANEL */}
                {selectedMethod === "cod" && (
                  <div className="payment-content-panel">
                    <h3>PAY ON DELIVERY</h3>

                    <p className="cod-message">
                      Pay when your order is delivered to your doorstep via Cash, UPI or Card.
                    </p>

                    <div className="cod-info">
                      <FiHome />

                      <div>
                        <strong>Cash / UPI / Card on Doorstep</strong>
                        <span>Pay comfortably at the time of delivery.</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="method-pay-btn"
                      onClick={handleCOD}
                      disabled={paymentLoading}
                    >
                      {paymentLoading
                        ? "PLACING ORDER..."
                        : `CONFIRM & PLACE ORDER ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT */}

          <aside className="payment-right">
            <div className="payment-summary-sticky">
              <div className="payment-delivery-card">
                <h2>Order Summary</h2>

                <div className="payment-delivery-divider" />

                <div className="payment-delivery-info">
                  <div className="payment-truck-icon">
                    <FiTruck />
                  </div>

                  <div>
                    <strong>Home Delivery to {pincode}</strong>

                    <span>
                      {orderItems.length} item
                      {orderItems.length !== 1 ? "s" : ""} will be delivered
                      soon
                    </span>
                  </div>
                </div>
              </div>

              <div className="payment-order-card">
                <h2>Order Summary</h2>

                <div className="payment-order-divider" />

                <div className="payment-summary-row">
                  <span>Total price (Inc GST)</span>

                  <strong>{formatPrice(totalMRP)}</strong>
                </div>

                <div className="payment-summary-row">
                  <span>Discount</span>

                  <strong>-{formatPrice(discount)}</strong>
                </div>

                <div className="payment-summary-row">
                  <span>Convenience fee</span>

                  <strong>
                    {formatPrice(deliveryCharge)} <del>₹100</del>
                  </strong>
                </div>

                <div className="payment-order-divider" />

                <div className="payment-total-row">
                  <span>TOTAL</span>

                  <strong>{formatPrice(totalAmount)}</strong>
                </div>

                <div className="payment-save-box">
                  You save <strong>{formatPrice(discount)}</strong> in this
                  order
                </div>
              </div>

              <div className="payment-reward-box">
                <div className="payment-reward-icon">
                  <FiAward />
                </div>

                <div>
                  <strong>Sporty Rewards: ₹{rewardBalance}</strong>

                  <span>Available Balance: ₹{rewardBalance}</span>
                </div>

                <button
                  type="button"
                  className={
                    rewardEnabled ? "payment-toggle active" : "payment-toggle"
                  }
                  disabled={rewardBalance <= 0}
                  onClick={() => setRewardEnabled((prev) => !prev)}
                >
                  <span />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* =====================================================
          STRIPE PAYMENT MODAL
      ===================================================== */}

      {showStripe && clientSecret && stripePromise && (
        <Elements
          key={`${order._id}-${clientSecret}`}
          stripe={stripePromise}
          options={{
            clientSecret,

            appearance: {
              theme: "stripe",

              variables: {
                colorPrimary: "#3544c4",

                colorText: "#222222",

                colorBackground: "#ffffff",

                borderRadius: "4px",

                fontFamily: "Arial, Helvetica, sans-serif",
              },
            },
          }}
        >
          <StripePaymentForm
            order={order}
            clientSecret={clientSecret}
            selectedMethod={selectedMethod}
            selectedUpiApp={selectedUpiApp}
            vpaId={vpaId}
            upiOption={upiOption}
            selectedBank={selectedBank}
            selectedPayLater={selectedPayLater}
            payLaterMobile={payLaterMobile}
            onClose={() => {
              setShowStripe(false);
              setClientSecret("");
            }}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </>
  );
};

export default Payment;
