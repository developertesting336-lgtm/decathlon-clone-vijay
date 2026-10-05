import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiUser,
  FiPackage,
  FiAlertCircle,
  FiCheckCircle,
  FiSend,
  FiShield,
  FiFolder,
  FiExternalLink,
} from "react-icons/fi";
import api from "../../api/axios";
import "./SupportManagement.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const AdminSupportTicketDetails = () => {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for updates
  const [selectedStatus, setSelectedStatus] = useState("open");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [responseText, setResponseText] = useState("");
  const [resolveOnSend, setResolveOnSend] = useState(false);

  // Loading button states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);

  // Fetch Ticket Details
  const fetchTicketDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/support/admin/tickets/${ticketId}`);
      if (res.data?.success && res.data?.ticket) {
        const t = res.data.ticket;
        setTicket(t);
        setSelectedStatus((t.status || "open").toLowerCase());
        setSelectedPriority((t.priority || "medium").toLowerCase());
        setResponseText(t.adminResponse || "");
      } else {
        setError("Support ticket not found");
      }
    } catch (err) {
      console.error("Failed to load admin ticket details:", err);
      setError(err.response?.data?.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  // Handle Status Update
  const handleStatusChange = async (newStatus) => {
    if (newStatus === selectedStatus) return;

    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/support/admin/tickets/${ticketId}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`);
        setSelectedStatus(newStatus);
        setTicket((prev) => ({
          ...prev,
          status: newStatus,
          resolvedAt: newStatus === "resolved" ? new Date() : prev.resolvedAt,
        }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err.response?.data?.message || "Failed to update ticket status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Priority Update
  const handlePriorityChange = async (newPriority) => {
    if (newPriority === selectedPriority) return;

    try {
      setUpdatingPriority(true);
      const res = await api.patch(`/support/admin/tickets/${ticketId}/priority`, {
        priority: newPriority,
      });

      if (res.data?.success) {
        toast.success(`Ticket priority updated to ${newPriority}`);
        setSelectedPriority(newPriority);
        setTicket((prev) => ({ ...prev, priority: newPriority }));
      }
    } catch (err) {
      console.error("Failed to update priority:", err);
      toast.error(err.response?.data?.message || "Failed to update ticket priority");
    } finally {
      setUpdatingPriority(false);
    }
  };

  // Handle Sending Admin Response
  const handleSendResponse = async (e) => {
    e.preventDefault();

    if (!responseText.trim()) {
      toast.error("Please enter a response message before sending");
      return;
    }

    try {
      setSendingResponse(true);

      const payload = {
        adminResponse: responseText.trim(),
        response: responseText.trim(),
      };

      if (resolveOnSend) {
        payload.status = "resolved";
      }

      const res = await api.patch(`/support/admin/tickets/${ticketId}/respond`, payload);

      if (res.data?.success) {
        toast.success("Response sent and customer notified successfully!");
        setResponseText("");
        const updatedTicket = res.data.ticket;
        if (updatedTicket) {
          setTicket(updatedTicket);
          setSelectedStatus((updatedTicket.status || "in_progress").toLowerCase());
        }
      }
    } catch (err) {
      console.error("Failed to send admin response:", err);
      toast.error(err.response?.data?.message || "Failed to send response");
    } finally {
      setSendingResponse(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || "open").toLowerCase();
    let label = "Open";
    if (s === "in_progress") label = "In Progress";
    else if (s === "resolved") label = "Resolved";
    else if (s === "closed") label = "Closed";

    return <span className={`support-status-badge ${s}`}>{label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || "medium").toLowerCase();
    return <span className={`support-priority-badge ${p}`}>{p}</span>;
  };

  if (loading) {
    return (
      <div className="support-admin-container">
        <div className="support-empty-state" style={{ minHeight: 400 }}>
          <div className="support-spinner" />
          <p>Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="support-admin-container">
        <div className="support-empty-state" style={{ minHeight: 350 }}>
          <FiAlertCircle style={{ fontSize: 48, color: "#e11d48", marginBottom: 12 }} />
          <h2>Ticket Not Found</h2>
          <p>{error || "The requested support ticket could not be found."}</p>
          <Link to="/admin/support?tab=tickets" className="support-btn-primary" style={{ marginTop: 16 }}>
            <FiArrowLeft /> Back to Support Tickets
          </Link>
        </div>
      </div>
    );
  }

  const customerName = ticket.user?.name || ticket.guestName || "Guest Customer";
  const customerEmail = ticket.user?.email || ticket.guestEmail || "No email available";
  const customerPhone = ticket.user?.phone || "No phone provided";
  const displayCode = ticket.ticketId || `#${(ticket._id || "").slice(-8).toUpperCase()}`;

  return (
    <div className="support-admin-container">
      {/* 1. Header & Navigation */}
      <div className="support-admin-header">
        <div>
          <Link to="/admin/support?tab=tickets" className="support-back-link">
            <FiArrowLeft /> Back to All Tickets
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <span className="support-ticket-id-pill" style={{ fontSize: 15, padding: "5px 12px" }}>
              {displayCode}
            </span>
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Created {formatDate(ticket.createdAt)}
            </span>
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <span style={{ fontSize: 13, color: "#64748b" }}>
                • Updated {formatDate(ticket.updatedAt)}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 24, margin: "8px 0 0", color: "#0f172a" }}>
            {ticket.subject}
          </h1>
        </div>

        <div className="support-admin-header-actions">
          <button
            type="button"
            className="support-btn-secondary"
            onClick={fetchTicketDetails}
          >
            <FiCheckCircle /> Refresh Data
          </button>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="support-details-admin-grid">
        {/* LEFT COLUMN: Customer Message & Admin Response */}
        <div className="support-details-main-column">
          {/* Customer Message Box */}
          <div className="support-card-box">
            <div className="support-card-box-header">
              <div className="box-title-group">
                <FiUser className="box-icon" />
                <h3>Customer Inquiry</h3>
              </div>
              <span className="box-subtitle">Submitted by {customerName}</span>
            </div>
            <div className="support-card-box-body">
              <div className="customer-original-message-content">
                {ticket.message}
              </div>
            </div>
          </div>

          {/* Admin Response Section */}
          <div className="support-card-box" style={{ borderTop: "3px solid #3548c4" }}>
            <div className="support-card-box-header">
              <div className="box-title-group">
                <FiShield className="box-icon" style={{ color: "#3548c4" }} />
                <h3>Support Team Response</h3>
              </div>
              {ticket.adminResponse && (
                <span className="support-status-badge resolved">Response Saved</span>
              )}
            </div>

            <div className="support-card-box-body">
              <form onSubmit={handleSendResponse} noValidate>
                <label className="support-field-label" htmlFor="admin-response-input">
                  Write a response to the customer:
                </label>
                <textarea
                  id="admin-response-input"
                  className="support-textarea-field"
                  placeholder="Type your official support response here. The customer will receive a Web Push, in-app notification, and see this in their ticket view..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={6}
                  disabled={sendingResponse}
                />

                <div className="response-form-footer">
                  <label className="support-checkbox-label">
                    <input
                      type="checkbox"
                      checked={resolveOnSend}
                      onChange={(e) => setResolveOnSend(e.target.checked)}
                      disabled={sendingResponse}
                    />
                    <span>Mark ticket as Resolved when response is sent</span>
                  </label>

                  <button
                    type="submit"
                    className="support-btn-primary"
                    disabled={sendingResponse}
                  >
                    <FiSend /> {sendingResponse ? "Sending..." : "Send Response"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Status Controls, Customer Info, Linked Order */}
        <div className="support-details-sidebar-column">
          {/* Status & Priority Management Card */}
          <div className="support-card-box">
            <div className="support-card-box-header">
              <h3>Manage Ticket Status</h3>
            </div>
            <div className="support-card-box-body">
              <div className="support-manage-field-group">
                <label className="support-field-label">Status</label>
                <select
                  className="support-select-field"
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {updatingStatus && <span className="updating-hint">Updating status...</span>}
              </div>

              <div className="support-manage-field-group" style={{ marginTop: 16 }}>
                <label className="support-field-label">Priority</label>
                <select
                  className="support-select-field"
                  value={selectedPriority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updatingPriority}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {updatingPriority && <span className="updating-hint">Updating priority...</span>}
              </div>

              <div className="support-manage-field-group" style={{ marginTop: 16 }}>
                <label className="support-field-label">Issue Type</label>
                <div className="support-readonly-tag">
                  {ticket.issueType || "General"}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Card */}
          <div className="support-card-box">
            <div className="support-card-box-header">
              <div className="box-title-group">
                <FiUser />
                <h3>Customer Details</h3>
              </div>
            </div>
            <div className="support-card-box-body customer-info-box">
              <div className="customer-info-row">
                <span className="info-key">Name:</span>
                <span className="info-val"><strong>{customerName}</strong></span>
              </div>
              <div className="customer-info-row">
                <span className="info-key">Email:</span>
                <span className="info-val">{customerEmail}</span>
              </div>
              <div className="customer-info-row">
                <span className="info-key">Phone:</span>
                <span className="info-val">{customerPhone}</span>
              </div>
              {ticket.user?._id && (
                <div className="customer-info-row">
                  <span className="info-key">User ID:</span>
                  <span className="info-val" style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {ticket.user._id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Order Card (if present) */}
          {ticket.order && (
            <div className="support-card-box linked-order-admin-box">
              <div className="support-card-box-header">
                <div className="box-title-group">
                  <FiPackage style={{ color: "#166534" }} />
                  <h3 style={{ color: "#166534" }}>Linked Order</h3>
                </div>
                <Link
                  to={`/orders?search=${(ticket.order._id || ticket.order).toString()}`}
                  className="view-order-admin-btn"
                  title="View order in Admin Orders"
                >
                  View Order <FiExternalLink />
                </Link>
              </div>
              <div className="support-card-box-body">
                <div className="customer-info-row">
                  <span className="info-key">Order #:</span>
                  <span className="info-val" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    #{(ticket.order._id || ticket.order).toString().slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="customer-info-row">
                  <span className="info-key">Status:</span>
                  <span className="info-val" style={{ textTransform: "capitalize", fontWeight: 600 }}>
                    {ticket.order.orderStatus || "Processing"}
                  </span>
                </div>
                {ticket.order.totalAmount && (
                  <div className="customer-info-row">
                    <span className="info-key">Amount:</span>
                    <span className="info-val" style={{ fontWeight: 700, color: "#15803d" }}>
                      ₹{Number(ticket.order.totalAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category Card */}
          {ticket.category && (
            <div className="support-card-box">
              <div className="support-card-box-header">
                <div className="box-title-group">
                  <FiFolder />
                  <h3>Support Category</h3>
                </div>
              </div>
              <div className="support-card-box-body">
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0f172a" }}>
                  {ticket.category.name}
                </p>
                {ticket.category.description && (
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    {ticket.category.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTicketDetails;
