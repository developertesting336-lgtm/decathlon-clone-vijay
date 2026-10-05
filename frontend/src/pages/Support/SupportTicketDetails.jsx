import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiClock,
  FiPackage,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiShield,
  FiExternalLink,
} from "react-icons/fi";
import api from "../../api/axios";
import socket from "../../socket/socket";
import "./SupportTickets.css";

const SupportTicketDetails = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Ticket Details | Decathlon Help Center";
    window.scrollTo(0, 0);
  }, []);

  // Fetch ticket details via Axios
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!ticketId) {
      setError("Ticket ID is required");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/support/tickets/${ticketId}`);
        if (isMounted && res.data?.success && res.data?.ticket) {
          setTicket(res.data.ticket);
        } else {
          setError("Support ticket not found");
        }
      } catch (err) {
        console.error("Error fetching ticket details:", err);
        const status = err.response?.status;
        if (status === 403) {
          setError("Access denied. You do not have permission to view this ticket.");
        } else if (status === 404) {
          setError("Support ticket not found.");
        } else {
          setError(err.response?.data?.message || "Failed to load support ticket details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTicket();
    return () => {
      isMounted = false;
    };
  }, [ticketId, token]);

  // Real-time socket auto-refresh for customer
  useEffect(() => {
    if (!ticketId) return;

    const handleTicketRealtime = (payload) => {
      const updated = payload?.ticket || payload?.data;
      if (!updated) return;

      const isCurrentTicket =
        (updated._id && updated._id.toString() === ticketId.toString()) ||
        (updated.ticketId && updated.ticketId.toString() === ticketId.toString());

      if (isCurrentTicket) {
        setTicket((prev) => {
          if (!prev) return updated;
          return {
            ...prev,
            ...updated,
            category: updated.category || prev.category,
            order: updated.order || prev.order,
          };
        });
        toast("Ticket updated by support team", {
          icon: "ℹ️",
          style: {
            borderRadius: "8px",
            background: "#0f172a",
            color: "#fff",
            fontSize: "13px",
          },
        });
      }
    };

    socket.on("support_ticket_updated", handleTicketRealtime);
    socket.on("support_ticket_update", handleTicketRealtime);

    return () => {
      socket.off("support_ticket_updated", handleTicketRealtime);
      socket.off("support_ticket_update", handleTicketRealtime);
    };
  }, [ticketId]);

  // Handle closing ticket
  const handleCloseTicket = async () => {
    if (!window.confirm("Are you sure you want to close this support ticket?")) {
      return;
    }

    try {
      setClosing(true);
      const res = await api.patch(`/support/tickets/${ticketId}/close`);
      if (res.data?.success) {
        toast.success(res.data.message || "Support ticket closed successfully");
        setTicket(res.data.ticket || { ...ticket, status: "closed", resolvedAt: new Date() });
      } else {
        toast.error(res.data?.message || "Failed to close ticket");
      }
    } catch (err) {
      console.error("Error closing ticket:", err);
      toast.error(err.response?.data?.message || "Failed to close support ticket");
    } finally {
      setClosing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
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

    return <span className={`ticket-badge ${s}`}>{label}</span>;
  };

  // Login required view
  if (!token) {
    return (
      <div className="support-tickets-page-wrapper">
        <div className="support-tickets-inner" style={{ maxWidth: 600 }}>
          <div className="support-nav-breadcrumb">
            <Link to="/support">Support</Link>
            <span className="separator">/</span>
            <span className="active">Ticket Details</span>
          </div>

          <div className="support-ticket-form-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FiAlertCircle style={{ fontSize: 44, color: "#f59e0b", marginBottom: 16 }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px 0" }}>Login Required</h2>
            <p style={{ color: "#64748b", fontSize: 14.5, margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Please sign in to view this customer support ticket.
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

  // Loading state
  if (loading) {
    return (
      <div className="support-tickets-page-wrapper">
        <div className="support-tickets-inner">
          <div className="support-nav-breadcrumb">
            <Link to="/support">Support</Link>
            <span className="separator">/</span>
            <Link to="/support/tickets">My Requests</Link>
            <span className="separator">/</span>
            <span className="active">Loading...</span>
          </div>
          <div className="support-details-card" style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
            <p style={{ fontSize: 16, fontWeight: 500 }}>Loading ticket details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="support-tickets-page-wrapper">
        <div className="support-tickets-inner" style={{ maxWidth: 640 }}>
          <div className="support-nav-breadcrumb">
            <Link to="/support">Support</Link>
            <span className="separator">/</span>
            <Link to="/support/tickets">My Requests</Link>
            <span className="separator">/</span>
            <span className="active">Error</span>
          </div>

          <div className="support-ticket-form-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FiXCircle style={{ fontSize: 48, color: "#e11d48", marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>Unable to View Ticket</h2>
            <p style={{ color: "#64748b", fontSize: 14.5, margin: "0 0 24px 0", lineHeight: 1.5 }}>
              {error || "The support ticket you are trying to view could not be found."}
            </p>
            <Link to="/support/tickets" className="btn-create-ticket-primary">
              <FiArrowLeft /> Back to My Requests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = (ticket.status || "open").toLowerCase();
  const canClose = currentStatus === "open" || currentStatus === "in_progress";
  const displayCode = ticket.ticketId || `#${(ticket._id || "").slice(-8).toUpperCase()}`;

  return (
    <div className="support-tickets-page-wrapper">
      <div className="support-tickets-inner">
        {/* Navigation Breadcrumb */}
        <div className="support-nav-breadcrumb">
          <Link to="/support">Support</Link>
          <span className="separator">/</span>
          <Link to="/support/tickets">My Requests</Link>
          <span className="separator">/</span>
          <span className="active">{displayCode}</span>
        </div>

        {/* Ticket Details Main Card */}
        <div className="support-details-card">
          {/* Header */}
          <div className="support-details-header">
            <div className="support-details-title-area">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <span className="ticket-code-tag" style={{ fontSize: 13, padding: "4px 10px" }}>
                  {displayCode}
                </span>
                {getStatusBadge(ticket.status)}
                <span
                  className="ticket-issuetype-badge"
                  style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}
                >
                  Priority: {ticket.priority || "Medium"}
                </span>
              </div>
              <h2>{ticket.subject}</h2>
              <div className="support-details-meta-row">
                <span>
                  <FiClock /> Submitted on {formatDate(ticket.createdAt)}
                </span>
                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <span>
                    • Updated on {formatDate(ticket.updatedAt)}
                  </span>
                )}
                {ticket.resolvedAt && (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                    • Resolved on {formatDate(ticket.resolvedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="support-details-actions-area">
              {canClose && (
                <button
                  type="button"
                  className="btn-close-ticket"
                  onClick={handleCloseTicket}
                  disabled={closing}
                  title="Mark this support ticket as closed"
                >
                  <FiXCircle /> {closing ? "Closing..." : "Close Request"}
                </button>
              )}
              <Link to="/support/tickets" className="btn-form-cancel">
                <FiArrowLeft /> Back
              </Link>
            </div>
          </div>

          {/* Body */}
          <div className="support-details-body">
            {/* Summary Grid */}
            <div className="ticket-info-summary-grid">
              <div className="ticket-info-summary-item">
                <span className="info-label">Issue Category</span>
                <span className="info-value">{ticket.category?.name || "General Help"}</span>
              </div>
              <div className="ticket-info-summary-item">
                <span className="info-label">Issue Type</span>
                <span className="info-value" style={{ textTransform: "capitalize" }}>
                  {ticket.issueType || "Support"}
                </span>
              </div>
              <div className="ticket-info-summary-item">
                <span className="info-label">Current Status</span>
                <span className="info-value" style={{ textTransform: "capitalize" }}>
                  {(ticket.status || "open").replace("_", " ")}
                </span>
              </div>
              <div className="ticket-info-summary-item">
                <span className="info-label">Ticket ID</span>
                <span className="info-value" style={{ fontFamily: "monospace", color: "#0082c3" }}>
                  {displayCode}
                </span>
              </div>
            </div>

            {/* Linked Order Banner (if applicable) */}
            {ticket.order && (
              <div className="ticket-linked-order-box">
                <div className="ticket-linked-order-info">
                  <FiPackage className="ticket-order-icon" />
                  <div className="ticket-linked-order-text">
                    <strong>
                      Linked Order #{(ticket.order._id || ticket.order).toString().slice(-8).toUpperCase()}
                    </strong>
                    <span>
                      Status: {ticket.order.orderStatus || "Processing"}
                      {ticket.order.totalAmount &&
                        ` • Total: ₹${Number(ticket.order.totalAmount).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>
                <Link
                  to="/account/orders-returns"
                  className="btn-view-order-link"
                  title="View order tracking and timeline"
                >
                  View Order <FiExternalLink />
                </Link>
              </div>
            )}

            {/* Customer Message */}
            <div className="ticket-message-block">
              <div className="ticket-message-block-title">
                <FiUser /> Your Message
              </div>
              <div className="ticket-user-message-card">
                {ticket.message}
              </div>
            </div>

            {/* Support Response Block */}
            <div className="ticket-message-block">
              <div className="ticket-message-block-title">
                <FiShield /> Support Team Response
              </div>

              {ticket.adminResponse ? (
                <div className="ticket-admin-response-card">
                  <div className="admin-response-header">
                    <div className="admin-badge-icon">
                      <FiCheckCircle />
                    </div>
                    <strong>Decathlon Customer Support</strong>
                  </div>
                  <p className="admin-response-text">{ticket.adminResponse}</p>
                </div>
              ) : (
                <div className="ticket-admin-response-card pending">
                  <p style={{ margin: 0, fontSize: 14 }}>
                    Our customer care team is currently reviewing your ticket. You will receive an update here as soon as an agent responds.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetails;
