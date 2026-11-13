import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiTruck,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiMapPin,
  FiPhone,
  FiHelpCircle,
  FiPrinter,
  FiAlertCircle,
  FiX,
  FiEdit3,
} from "react-icons/fi";
import { FaStar, FaRegStar } from "react-icons/fa";
import toast from "react-hot-toast";
import api, { isTokenExpired } from "../api/axios";
import socket from "../socket/socket";
import "../styles/OrderDetail.css";

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

const formatPrice = (price) => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

const formatStatus = (status) => {
  if (!status) return "";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getImageUrl = (image) => {
  if (!image) return "https://via.placeholder.com/80?text=Product";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  const apiBaseUrl = api.defaults.baseURL || "";
  const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
  if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
  if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
  return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
};

const RATING_DESCRIPTIONS = {
  1: "Very Bad",
  2: "Bad",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User reviews cache: { [productId]: reviewObject }
  const [userReviews, setUserReviews] = useState({});

  // Review Modal state (ONLY accessible for delivered orders)
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [formRating, setFormRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormError, setReviewFormError] = useState("");

  // Cancel order modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetails, setCancelDetails] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Fetch Order
  const fetchOrderDetails = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      toast("Please login to view your order details.", { icon: "🔒" });
      navigate("/login", { state: { from: `/account/orders/${orderId}` } });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/orders/${orderId}`, getAuthConfig());
      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      console.error("Fetch Order Detail Error:", err);
      setError(
        err.response?.data?.message ||
          "Could not load order details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  // Fetch user's existing reviews to show existing feedback if already reviewed
  const fetchUserReviews = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) return;

    try {
      const res = await api.get("/reviews/my-reviews", getAuthConfig());
      if (res.data?.success && Array.isArray(res.data.reviews)) {
        const map = {};
        for (const rev of res.data.reviews) {
          const pid = (rev.product?._id || rev.product || "").toString();
          if (pid) {
            map[pid] = rev;
          }
        }
        setUserReviews(map);
      }
    } catch (err) {
      // Non-critical: ignore or silent fail
      console.error("Fetch User Reviews error:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrderDetails();
    fetchUserReviews();
  }, [fetchOrderDetails, fetchUserReviews]);

  // Real-time socket updates for order status
  useEffect(() => {
    const handleOrderUpdate = (payload) => {
      const targetId = payload?._id || payload?.orderId;
      if (targetId && String(targetId) === String(orderId)) {
        fetchOrderDetails();
      }
    };

    socket.on("order_updated", handleOrderUpdate);
    socket.on("order_cancelled", handleOrderUpdate);
    socket.on("order_tracking_updated", handleOrderUpdate);

    return () => {
      socket.off("order_updated", handleOrderUpdate);
      socket.off("order_cancelled", handleOrderUpdate);
      socket.off("order_tracking_updated", handleOrderUpdate);
    };
  }, [orderId, fetchOrderDetails]);

  // Open Review Modal for a specific item (ONLY for delivered orders)
  const handleOpenReviewModal = (item) => {
    if (order?.orderStatus?.toLowerCase() !== "delivered") {
      toast.error("Reviews can only be written for delivered orders.");
      return;
    }

    const productId = (item.product?._id || item.product || "").toString();
    const existing = userReviews[productId];

    setReviewModalItem(item);
    if (existing) {
      setFormRating(existing.rating || 5);
      setFormTitle(existing.title || "");
      setFormComment(existing.comment || "");
    } else {
      setFormRating(5);
      setFormTitle("");
      setFormComment("");
    }
    setHoverRating(0);
    setReviewFormError("");
  };

  const handleCloseReviewModal = () => {
    if (submittingReview) return;
    setReviewModalItem(null);
    setReviewFormError("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalItem) return;

    if (!formRating || formRating < 1 || formRating > 5) {
      setReviewFormError("Please select a star rating between 1 and 5.");
      return;
    }

    if (!formComment.trim()) {
      setReviewFormError("Please write a few words about your experience.");
      return;
    }

    const productId = (
      reviewModalItem.product?._id ||
      reviewModalItem.product ||
      ""
    ).toString();
    const existing = userReviews[productId];

    try {
      setSubmittingReview(true);
      setReviewFormError("");

      if (existing && existing._id) {
        // Update existing review
        await api.put(
          `/reviews/${existing._id}`,
          {
            rating: Number(formRating),
            title: formTitle.trim(),
            comment: formComment.trim(),
          },
          getAuthConfig()
        );
        toast.success("Review updated successfully!");
      } else {
        // Create new review
        await api.post(
          "/reviews",
          {
            productId,
            rating: Number(formRating),
            title: formTitle.trim(),
            comment: formComment.trim(),
          },
          getAuthConfig()
        );
        toast.success("Review submitted successfully! Thank you for your feedback.");
      }

      setReviewModalItem(null);
      await fetchUserReviews();
    } catch (err) {
      console.error("Submit Review Error:", err);
      setReviewFormError(
        err.response?.data?.message || "Failed to submit review. Please try again."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // Cancel order handler
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!order) return;
    if (!cancelReason) {
      toast.error("Please select a cancellation reason");
      return;
    }

    const combinedReason = cancelDetails.trim()
      ? `${cancelReason}: ${cancelDetails.trim()}`
      : cancelReason;

    try {
      setCancelling(true);
      const res = await api.put(
        `/orders/${order._id}/cancel`,
        { reason: combinedReason },
        getAuthConfig()
      );
      toast.success(res.data?.message || "Order cancelled successfully");
      setShowCancelModal(false);
      setCancelReason("");
      setCancelDetails("");
      fetchOrderDetails();
    } catch (err) {
      console.error("Cancel Order Error:", err);
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-loading-box">
            <div className="order-detail-spinner" />
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-error-box">
            <FiAlertCircle size={48} color="#e53935" />
            <h2>Order Not Found</h2>
            <p>{error || "We could not find the order you are looking for."}</p>
            <button
              type="button"
              className="order-detail-btn-primary"
              onClick={() => navigate("/account/orders-returns?tab=order-returns")}
            >
              <FiArrowLeft /> Back to My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDelivered = order.orderStatus?.toLowerCase() === "delivered";
  const isCancelled = order.orderStatus?.toLowerCase() === "cancelled";
  const isPending =
    order.orderStatus === "pending" || order.orderStatus === "confirmed";

  // Tracker milestones data
  const shortId = (order._id || "").slice(-8).toUpperCase();
  const address = order.shippingAddress || {};

  return (
    <div className="order-detail-page">
      <div className="order-detail-container">
        {/* TOP NAVIGATION / BREADCRUMB */}
        <div className="order-detail-nav-bar">
          <button
            type="button"
            className="order-detail-back-link"
            onClick={() => navigate("/account/orders-returns?tab=order-returns")}
          >
            <FiArrowLeft /> Back to My Orders
          </button>
          <div className="order-detail-breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/account/orders-returns?tab=order-returns">My Orders</Link>
            <span>/</span>
            <span className="current">Order #{shortId}</span>
          </div>
        </div>

        {/* ORDER HEADER BANNER */}
        <div className="order-detail-header-card">
          <div className="order-detail-header-left">
            <span className="order-detail-id-label">Order #{shortId}</span>
            <span className="order-detail-placed-date">
              Placed on {formatDateTime(order.createdAt)}
            </span>
          </div>
          <div className="order-detail-header-badges">
            <span
              className={`order-detail-status-pill ${
                isCancelled ? "cancelled" : isDelivered ? "delivered" : "active"
              }`}
            >
              {isCancelled ? (
                <>
                  <FiXCircle /> Cancelled
                </>
              ) : isDelivered ? (
                <>
                  <FiCheckCircle /> Delivered
                </>
              ) : (
                <>
                  <FiTruck /> {formatStatus(order.orderStatus)}
                </>
              )}
            </span>

            <span
              className={`order-detail-payment-pill ${
                order.paymentStatus === "paid"
                  ? "paid"
                  : order.paymentStatus === "refunded"
                  ? "refunded"
                  : "pending"
              }`}
            >
              {order.paymentMethod === "COD"
                ? order.paymentStatus === "paid"
                  ? "COD • PAID"
                  : isCancelled
                  ? "COD • NOT CHARGED"
                  : "COD • PENDING"
                : order.paymentStatus === "paid"
                ? "PAID ONLINE"
                : order.paymentStatus === "refunded"
                ? "REFUNDED"
                : "PAYMENT PENDING"}
            </span>
          </div>
        </div>

        {/* TOP 3-COLUMN SUMMARY GRID (Flipkart style) */}
        <div className="order-detail-summary-grid">
          {/* 1. DELIVERY ADDRESS */}
          <div className="order-detail-card address-card">
            <div className="order-card-section-title">
              <FiMapPin /> Delivery Address
            </div>
            <div className="order-address-content">
              <h4 className="order-recipient-name">
                {address.firstName} {address.lastName}
              </h4>
              <p className="order-address-street">
                {address.houseBuilding && `${address.houseBuilding}, `}
                {address.streetLocality}
              </p>
              {address.landmark && (
                <p className="order-address-landmark">
                  Landmark: {address.landmark}
                </p>
              )}
              <p className="order-address-city">
                {address.cityState} - {address.pincode}
              </p>
              <div className="order-address-phone">
                <FiPhone /> <strong>Phone number:</strong> {address.mobile}
              </div>
              <span className="order-delivery-mode-tag">
                {order.deliveryOption === "pickup"
                  ? "🏬 Store Pickup"
                  : "🚚 Standard Home Delivery"}
              </span>
            </div>
          </div>

          {/* 2. PRICE DETAILS (Flipkart Price Breakdown) */}
          <div className="order-detail-card price-card">
            <div className="order-card-section-title">
              <FiPackage /> Price Details
            </div>
            <div className="order-price-breakdown">
              <div className="price-row">
                <span>List Price (Items Total)</span>
                <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
              </div>
              <div className="price-row">
                <span>Delivery Fee</span>
                <span className="price-free">
                  {order.deliveryCharge > 0
                    ? formatPrice(order.deliveryCharge)
                    : "FREE"}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="price-row discount">
                  <span>Coupon / Discount</span>
                  <span>- {formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="price-row total">
                <strong>Total Amount</strong>
                <strong className="final-price">
                  {formatPrice(order.totalAmount)}
                </strong>
              </div>
              <div className="payment-mode-note">
                Payment mode: <strong>{order.paymentMethod || "COD"}</strong>
              </div>
            </div>
          </div>

          {/* 3. ORDER ACTIONS & INVOICE */}
          <div className="order-detail-card actions-card">
            <div className="order-card-section-title">
              <FiHelpCircle /> More Actions
            </div>
            <div className="order-action-links-list">
              <button
                type="button"
                className="order-detail-secondary-btn"
                onClick={() => window.print()}
              >
                <FiPrinter /> Download / Print Invoice
              </button>

              <button
                type="button"
                className="order-detail-secondary-btn"
                onClick={() => navigate("/support")}
              >
                <FiHelpCircle /> Need Help with this Order?
              </button>

              {isPending && (
                <button
                  type="button"
                  className="order-detail-danger-btn"
                  onClick={() => setShowCancelModal(true)}
                >
                  <FiXCircle /> Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS & TRACKER SECTION (Flipkart Core View) */}
        <div className="order-detail-items-container">
          <div className="order-items-heading">
            <h3>Items in this Order ({order.orderItems?.length || 0})</h3>
          </div>

          <div className="order-items-list-wrapper">
            {order.orderItems?.map((item, idx) => {
              const productId = (
                item.product?._id ||
                item.product ||
                ""
              ).toString();
              const existingReview = userReviews[productId];

              return (
                <div key={idx} className="flipkart-order-item-card">
                  {/* LEFT: PRODUCT DETAILS */}
                  <div className="flipkart-item-main">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="flipkart-item-thumbnail"
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/90?text=Product";
                      }}
                    />
                    <div className="flipkart-item-info">
                      <Link
                        to={productId ? `/product/${productId}` : "#"}
                        className="flipkart-item-title"
                      >
                        {item.name}
                      </Link>
                      <div className="flipkart-item-meta-row">
                        {item.size && (
                          <span className="flipkart-item-tag">
                            Size: {item.size}
                          </span>
                        )}
                        <span className="flipkart-item-tag">
                          Qty: {item.quantity}
                        </span>
                        {item.color && (
                          <span className="flipkart-item-tag">
                            Color: {item.color}
                          </span>
                        )}
                      </div>
                      <div className="flipkart-item-price-tag">
                        {formatPrice(item.price * item.quantity)}
                        {item.quantity > 1 && (
                          <span className="unit-price">
                            ({formatPrice(item.price)} each)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE: FLIPKART-STYLE STATUS TRACKER */}
                  <div className="flipkart-item-tracker">
                    {isCancelled ? (
                      <div className="flipkart-cancelled-notice">
                        <div className="cancelled-indicator-dot" />
                        <div className="cancelled-text">
                          <strong className="text-red">Order Cancelled</strong>
                          <span className="cancelled-date">
                            on{" "}
                            {formatDate(order.cancelledAt || order.updatedAt)}
                          </span>
                          {order.cancellationReason && (
                            <p className="cancellation-reason">
                              Reason: {order.cancellationReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flipkart-stepper-row">
                        {/* 1. Ordered */}
                        <div className="stepper-step completed">
                          <div className="step-circle">
                            <FiCheckCircle />
                          </div>
                          <div className="step-content">
                            <strong>Order Confirmed</strong>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <div
                          className={`stepper-line ${
                            order.orderStatus !== "pending" ? "active" : ""
                          }`}
                        />

                        {/* 2. Shipped */}
                        <div
                          className={`stepper-step ${
                            ["shipped", "delivered"].includes(
                              order.orderStatus?.toLowerCase()
                            )
                              ? "completed"
                              : order.orderStatus === "processing"
                              ? "current"
                              : ""
                          }`}
                        >
                          <div className="step-circle">
                            {["shipped", "delivered"].includes(
                              order.orderStatus?.toLowerCase()
                            ) ? (
                              <FiCheckCircle />
                            ) : (
                              <FiClock />
                            )}
                          </div>
                          <div className="step-content">
                            <strong>Shipped</strong>
                            <span>
                              {order.trackingNumber
                                ? `AWB: ${order.trackingNumber}`
                                : "Standard Delivery"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`stepper-line ${
                            order.orderStatus?.toLowerCase() === "delivered"
                              ? "active"
                              : ""
                          }`}
                        />

                        {/* 3. Delivered */}
                        <div
                          className={`stepper-step ${
                            isDelivered ? "completed delivered" : ""
                          }`}
                        >
                          <div className="step-circle">
                            {isDelivered ? <FiCheckCircle /> : <FiClock />}
                          </div>
                          <div className="step-content">
                            <strong>
                              {isDelivered ? "Delivered" : "Expected Delivery"}
                            </strong>
                            <span>
                              {isDelivered
                                ? formatDate(order.deliveredAt || order.updatedAt)
                                : "Soon"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: RATE & REVIEW PRODUCT (SHOWS ONLY FOR DELIVERED ORDERS) */}
                  {isDelivered && (
                    <div className="flipkart-item-review-col">
                      {existingReview ? (
                        <div className="flipkart-existing-review-box">
                          <div className="review-badge-row">
                            <span className="user-rating-pill">
                              ★ {existingReview.rating}
                            </span>
                            <span className="rating-label">
                              {RATING_DESCRIPTIONS[existingReview.rating] ||
                                "Your Rating"}
                            </span>
                          </div>
                          {existingReview.title && (
                            <h5 className="review-headline">
                              "{existingReview.title}"
                            </h5>
                          )}
                          <p className="review-comment-excerpt">
                            {existingReview.comment}
                          </p>
                          <button
                            type="button"
                            className="btn-edit-product-review"
                            onClick={() => handleOpenReviewModal(item)}
                          >
                            <FiEdit3 /> Edit Review
                          </button>
                        </div>
                      ) : (
                        <div className="flipkart-write-review-prompt">
                          <button
                            type="button"
                            className="flipkart-rate-review-btn"
                            onClick={() => handleOpenReviewModal(item)}
                          >
                            <FaStar className="star-icon" /> Rate & Review Product
                          </button>
                          <span className="rate-subtext">
                            Help fellow athletes make better choices
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================
          REVIEW WRITING MODAL (ONLY FOR DELIVERED ORDERS)
      ========================================================= */}
      {reviewModalItem && (
        <div className="order-detail-modal-backdrop" onClick={handleCloseReviewModal}>
          <div
            className="order-detail-review-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="review-modal-header">
              <div className="review-modal-title-group">
                <h3>Rate & Review Product</h3>
                <span className="review-modal-product-name">
                  {reviewModalItem.name}
                </span>
              </div>
              <button
                type="button"
                className="review-modal-close-btn"
                onClick={handleCloseReviewModal}
                disabled={submittingReview}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="review-modal-body">
              {reviewFormError && (
                <div className="review-modal-error-alert">
                  <FiAlertCircle />
                  <span>{reviewFormError}</span>
                </div>
              )}

              {/* Star Rating Picker */}
              <div className="review-form-group">
                <label className="review-form-label">
                  Overall Rating <span className="req">*</span>
                </label>
                <div className="review-star-picker-row">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || formRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="review-star-btn"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFormRating(star)}
                        aria-label={`Rate ${star} star`}
                      >
                        {isFilled ? (
                          <FaStar size={32} color="#ff9800" />
                        ) : (
                          <FaRegStar size={32} color="#d1d5db" />
                        )}
                      </button>
                    );
                  })}
                  <span className="review-rating-verbal-tag">
                    {RATING_DESCRIPTIONS[hoverRating || formRating] || ""}
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div className="review-form-group">
                <label className="review-form-label" htmlFor="review-title">
                  Review Headline <span className="optional">(optional)</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  className="review-form-input"
                  placeholder="e.g. Excellent fit, perfect for running"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={100}
                  disabled={submittingReview}
                />
              </div>

              {/* Comment */}
              <div className="review-form-group">
                <label className="review-form-label" htmlFor="review-comment">
                  Detailed Review <span className="req">*</span>
                </label>
                <textarea
                  id="review-comment"
                  className="review-form-textarea"
                  rows={4}
                  placeholder="What did you like or dislike? How was the quality, fit, and comfort during exercise?"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  maxLength={1000}
                  required
                  disabled={submittingReview}
                />
                <span className="review-char-count">
                  {formComment.length} / 1000 characters
                </span>
              </div>

              <div className="review-modal-actions">
                <button
                  type="button"
                  className="btn-review-cancel"
                  onClick={handleCloseReviewModal}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-review-submit"
                  disabled={submittingReview}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          CANCEL ORDER MODAL
      ========================================================= */}
      {showCancelModal && (
        <div
          className="order-detail-modal-backdrop"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="order-detail-cancel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cancel-modal-header">
              <h3>Cancel Order #{shortId}</h3>
              <button
                type="button"
                className="review-modal-close-btn"
                onClick={() => setShowCancelModal(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="cancel-modal-body">
              <div className="review-form-group">
                <label className="review-form-label">
                  Why do you want to cancel? <span className="req">*</span>
                </label>
                <select
                  className="review-form-input"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price elsewhere">
                    Found a better price elsewhere
                  </option>
                  <option value="Delivery taking too long">
                    Delivery taking too long
                  </option>
                  <option value="Need to change size or color">
                    Need to change size or color
                  </option>
                  <option value="Need to change delivery address">
                    Need to change delivery address
                  </option>
                  <option value="Payment issue">Payment issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="review-form-group">
                <label className="review-form-label">
                  Additional Details (Optional)
                </label>
                <textarea
                  className="review-form-textarea"
                  rows={3}
                  placeholder="Tell us more about why you're cancelling..."
                  value={cancelDetails}
                  onChange={(e) => setCancelDetails(e.target.value)}
                />
              </div>

              <div className="review-modal-actions">
                <button
                  type="button"
                  className="btn-review-cancel"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="btn-cancel-confirm"
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;