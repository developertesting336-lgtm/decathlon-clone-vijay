import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiSend,
  FiAlertCircle,
} from "react-icons/fi";
import api from "../../api/axios";
import "./SupportTickets.css";

const ISSUE_TYPE_OPTIONS = [
  { value: "order", label: "Orders" },
  { value: "payment", label: "Payment" },
  { value: "delivery", label: "Delivery" },
  { value: "return", label: "Return" },
  { value: "exchange", label: "Exchange" },
  { value: "refund", label: "Refund" },
  { value: "product", label: "Product" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

const SupportTicketForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = localStorage.getItem("token");

  // Form states
  const [categoryId, setCategoryId] = useState(searchParams.get("category") || "");
  const [issueType, setIssueType] = useState(searchParams.get("issueType") || "order");
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Options states
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Create Support Request | Decathlon Help Center";
    window.scrollTo(0, 0);
  }, []);

  // 1. Fetch support categories dynamically using Axios
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get("/support/categories");
        if (isMounted && res.data?.success && Array.isArray(res.data?.categories)) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error("Failed to load categories for support ticket form:", err);
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch authenticated customer's past orders using existing orders API
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const fetchUserOrders = async () => {
      try {
        setLoadingOrders(true);
        const res = await api.get("/orders/my-orders");
        const orderList = res.data?.orders || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && Array.isArray(orderList)) {
          setOrders(orderList);
        }
      } catch (err) {
        console.error("Failed to load user orders for ticket form:", err);
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    };
    fetchUserOrders();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Please login to submit a support ticket");
      navigate("/login");
      return;
    }

    if (!issueType) {
      toast.error("Please select an issue type");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject for your request");
      return;
    }

    if (!message.trim()) {
      toast.error("Please describe your issue in the message box");
      return;
    }

    if (message.trim().length < 10) {
      toast.error("Please provide at least 10 characters describing your request");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        category: categoryId || null,
        issueType,
        order: orderId || null,
        subject: subject.trim(),
        message: message.trim(),
      };

      const res = await api.post("/support/tickets", payload);

      if (res.data?.success) {
        toast.success(res.data.message || "Support ticket created successfully!");
        setSubject("");
        setMessage("");
        setCategoryId("");
        setOrderId("");

        const newId = res.data.ticket?._id || res.data.ticket?.ticketId;
        if (newId) {
          navigate(`/support/tickets/${newId}`);
        } else {
          navigate("/support/tickets");
        }
      } else {
        toast.error(res.data?.message || "Failed to submit support request");
      }
    } catch (err) {
      console.error("Support ticket submission error:", err);
      toast.error(
        err.response?.data?.message ||
          "Unable to create support ticket. Please check your network and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // If user is not logged in, prompt authentication
  if (!token) {
    return (
      <div className="support-tickets-page-wrapper">
        <div className="support-tickets-inner" style={{ maxWidth: 600 }}>
          <div className="support-nav-breadcrumb">
            <Link to="/support">Support</Link>
            <span className="separator">/</span>
            <span className="active">Create Request</span>
          </div>

          <div className="support-ticket-form-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FiAlertCircle style={{ fontSize: 44, color: "#f59e0b", marginBottom: 16 }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px 0" }}>Login Required</h2>
            <p style={{ color: "#64748b", fontSize: 14.5, margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Please sign in to your Decathlon account to submit a support request or complaint.
            </p>
            <button
              type="button"
              className="btn-create-ticket-primary"
              onClick={() => navigate("/login")}
            >
              Log In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-tickets-page-wrapper">
      <div className="support-tickets-inner">
        {/* Navigation Breadcrumb */}
        <div className="support-nav-breadcrumb">
          <Link to="/support">Support</Link>
          <span className="separator">/</span>
          <Link to="/support/tickets">My Requests</Link>
          <span className="separator">/</span>
          <span className="active">Create Support Request</span>
        </div>

        {/* Page Header */}
        <div className="support-section-header-row">
          <div className="support-header-text">
            <h1>Create Support Request</h1>
            <p>Can't find the answer you need? Send us a ticket and our customer care team will assist you.</p>
          </div>
          <Link to="/support/tickets" className="btn-form-cancel">
            <FiArrowLeft style={{ marginRight: 6 }} /> My Requests
          </Link>
        </div>

        {/* Main Form Card */}
        <div className="support-ticket-form-card">
          <form onSubmit={handleSubmit} noValidate className="support-form-grid">
            {/* 1. Issue Category */}
            <div className="support-form-group">
              <label htmlFor="category" className="support-form-label">
                Issue Category <span className="support-form-hint" style={{ fontWeight: 400 }}>(Optional)</span>
              </label>
              <select
                id="category"
                className="support-form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={submitting || loadingCategories}
              >
                <option value="">-- Select Help Category --</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <span className="support-form-hint">
                Select the topic that best matches your problem.
              </span>
            </div>

            {/* 2. Issue Type */}
            <div className="support-form-group">
              <label htmlFor="issueType" className="support-form-label">
                Issue Type <span className="required-indicator">*</span>
              </label>
              <select
                id="issueType"
                className="support-form-select"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                disabled={submitting}
              >
                {ISSUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Related Order */}
            <div className="support-form-group">
              <label htmlFor="order" className="support-form-label">
                Related Order <span className="support-form-hint" style={{ fontWeight: 400 }}>(Optional)</span>
              </label>
              <select
                id="order"
                className="support-form-select"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                disabled={submitting || loadingOrders}
              >
                <option value="">No specific order (General question or inquiry)</option>
                {orders.map((ord) => {
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "";
                  const totalStr = ord.totalAmount ? `₹${Number(ord.totalAmount).toLocaleString("en-IN")}` : "";
                  const shortId = (ord._id || "").slice(-8).toUpperCase();
                  return (
                    <option key={ord._id} value={ord._id}>
                      Order #{shortId} — {ord.orderStatus || "Processing"} {totalStr ? `(${totalStr})` : ""} {dateStr ? `• ${dateStr}` : ""}
                    </option>
                  );
                })}
              </select>
              <span className="support-form-hint">
                Select the order if you are reporting a delivery, payment, return, or refund issue.
              </span>
            </div>

            {/* 4. Subject */}
            <div className="support-form-group">
              <div className="support-form-label">
                <span>
                  Subject <span className="required-indicator">*</span>
                </span>
                <span className="char-counter">{subject.length} / 120</span>
              </div>
              <input
                id="subject"
                type="text"
                className="support-form-input"
                placeholder="Brief summary of your issue (e.g. Payment deducted but order not confirmed)"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 120))}
                maxLength={120}
                disabled={submitting}
              />
            </div>

            {/* 5. Message */}
            <div className="support-form-group">
              <div className="support-form-label">
                <span>
                  Message / Details <span className="required-indicator">*</span>
                </span>
                <span className="char-counter">{message.length} / 2000</span>
              </div>
              <textarea
                id="message"
                className="support-form-textarea"
                placeholder="Please describe your issue in detail. If this is about payment, mention your transaction ID or payment method..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                rows={5}
                maxLength={2000}
                disabled={submitting}
              />
              <span className="support-form-hint">
                Be as specific as possible so our support team can help resolve your issue faster.
              </span>
            </div>

            {/* Form Actions */}
            <div className="support-form-actions">
              <button
                type="button"
                className="btn-form-cancel"
                onClick={() => navigate("/support")}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-form-submit"
                disabled={submitting}
              >
                {submitting ? (
                  "Submitting Request..."
                ) : (
                  <>
                    <FiSend /> Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketForm;
