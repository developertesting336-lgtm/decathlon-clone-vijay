import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiClock,
  FiPackage,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiInbox,
} from "react-icons/fi";
import api from "../../api/axios";
import socket from "../../socket/socket";
import "./SupportTickets.css";

const STATUS_FILTERS = [
  { key: "all", label: "All Requests" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

const SupportTickets = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    document.title = "My Support Requests | Decathlon Help Center";
    window.scrollTo(0, 0);
  }, []);

  // Fetch user support requests via Axios
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await api.get("/support/tickets");
        if (isMounted && res.data?.success && Array.isArray(res.data?.tickets)) {
          setTickets(res.data.tickets);
        }
      } catch (err) {
        console.error("Error fetching support tickets:", err);
        toast.error("Unable to load your support requests. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTickets();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Real-time socket auto-refresh for tickets list
  useEffect(() => {
    const handleTicketRealtime = (payload) => {
      const updated = payload?.ticket || payload?.data;
      if (!updated) return;

      setTickets((prev) => {
        const index = prev.findIndex(
          (t) =>
            (t._id && updated._id && t._id.toString() === updated._id.toString()) ||
            (t.ticketId && updated.ticketId && t.ticketId === updated.ticketId)
        );
        if (index !== -1) {
          const updatedList = [...prev];
          updatedList[index] = { ...updatedList[index], ...updated };
          return updatedList;
        } else if (payload.type === "created" || payload.type === "ticket_created") {
          return [updated, ...prev];
        }
        return prev;
      });
    };

    socket.on("support_ticket_updated", handleTicketRealtime);
    socket.on("support_ticket_update", handleTicketRealtime);

    return () => {
      socket.off("support_ticket_updated", handleTicketRealtime);
      socket.off("support_ticket_update", handleTicketRealtime);
    };
  }, []);

  // Filter tickets by status
  const filteredTickets = tickets.filter((t) => {
    if (activeFilter === "all") return true;
    const status = (t.status || "open").toLowerCase();
    return status === activeFilter;
  });

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

  // If user is not logged in, prompt authentication
  if (!token) {
    return (
      <div className="support-tickets-page-wrapper">
        <div className="support-tickets-inner" style={{ maxWidth: 600 }}>
          <div className="support-nav-breadcrumb">
            <Link to="/support">Support</Link>
            <span className="separator">/</span>
            <span className="active">My Requests</span>
          </div>

          <div className="support-ticket-form-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FiAlertCircle style={{ fontSize: 44, color: "#f59e0b", marginBottom: 16 }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px 0" }}>Login Required</h2>
            <p style={{ color: "#64748b", fontSize: 14.5, margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Please sign in to view your past and active customer support requests.
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
          <span className="active">My Support Requests</span>
        </div>

        {/* Section Header */}
        <div className="support-section-header-row">
          <div className="support-header-text">
            <h1>My Support Requests</h1>
            <p>Track the resolution status and updates for your queries and complaints.</p>
          </div>
          <Link to="/support/tickets/new" className="btn-create-ticket-primary">
            <FiPlus /> Create Support Request
          </Link>
        </div>

        {/* Filter Bar */}
        {tickets.length > 0 && (
          <div className="support-tickets-filter-bar">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.key === "all"
                  ? tickets.length
                  : tickets.filter((t) => (t.status || "open").toLowerCase() === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`ticket-filter-btn ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="support-tickets-list-container">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="support-ticket-row-card"
                style={{ opacity: 0.6, pointerEvents: "none" }}
              >
                <div className="ticket-card-content">
                  <div style={{ height: 20, width: 120, background: "#e2e8f0", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 24, width: "60%", background: "#e2e8f0", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 16, width: "80%", background: "#f1f5f9", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTickets.length > 0 ? (
          /* Tickets List */
          <div className="support-tickets-list-container">
            {filteredTickets.map((ticket) => {
              const ticketIdRef = ticket._id || ticket.ticketId;
              const displayCode = ticket.ticketId || `#${(ticket._id || "").slice(-8).toUpperCase()}`;

              return (
                <div
                  key={ticket._id || ticket.ticketId}
                  className="support-ticket-row-card"
                  onClick={() => navigate(`/support/tickets/${ticketIdRef}`)}
                  title="Click to view details and response"
                >
                  <div className="ticket-card-content">
                    <div className="ticket-card-top-meta">
                      <span className="ticket-code-tag">{displayCode}</span>
                      <span className="ticket-issuetype-badge">
                        {ticket.issueType || "Support"}
                      </span>
                      <span
                        className="ticket-issuetype-badge"
                        style={{
                          textTransform: "capitalize",
                          background: ticket.priority === "high" ? "#ffe4e6" : "#f1f5f9",
                          color: ticket.priority === "high" ? "#e11d48" : "#475569",
                          fontWeight: 600,
                        }}
                      >
                        Priority: {ticket.priority || "Medium"}
                      </span>
                      {ticket.category?.name && (
                        <span className="ticket-issuetype-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                          {ticket.category.name}
                        </span>
                      )}
                      {ticket.order && (
                        <span className="ticket-order-badge">
                          <FiPackage /> Order #{(ticket.order._id || ticket.order).toString().slice(-8).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="ticket-card-title">{ticket.subject}</h3>
                    <p className="ticket-card-message-snippet">{ticket.message}</p>

                    <div className="ticket-card-bottom-meta">
                      <span className="ticket-date-info">
                        <FiClock /> Created {formatDate(ticket.createdAt)}
                      </span>
                      {ticket.adminResponse && (
                        <span style={{ color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FiCheckCircle /> Response Received
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ticket-card-right-status">
                    {getStatusBadge(ticket.status)}
                    <button type="button" className="btn-ticket-view">
                      View <FiChevronRight />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="support-tickets-empty-card">
            <FiInbox className="empty-tickets-icon" />
            <h3>No Support Requests Found</h3>
            <p>
              {activeFilter !== "all"
                ? `You don't have any requests with status "${activeFilter}".`
                : "You haven't submitted any customer support requests yet. If you have an inquiry, question or issue, send us a request!"}
            </p>
            <Link to="/support/tickets/new" className="btn-create-ticket-primary">
              <FiPlus /> Create Support Request
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
