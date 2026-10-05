import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiEye,
  FiPackage,
  FiCheckCircle,
  FiLifeBuoy,
  FiRefreshCw,
  FiAlertCircle,
  FiAlertTriangle,
  FiXCircle,
  FiClock,
} from "react-icons/fi";
import api from "../../api/axios";
import socket from "../../socket/socket";
import "./SupportManagement.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ISSUE_TYPE_OPTIONS = [
  { value: "all", label: "All Issue Types" },
  { value: "order", label: "Order" },
  { value: "payment", label: "Payment" },
  { value: "delivery", label: "Delivery" },
  { value: "return", label: "Return" },
  { value: "exchange", label: "Exchange" },
  { value: "refund", label: "Refund" },
  { value: "product", label: "Product" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

const SupportTickets = ({ embedded = false }) => {
  const navigate = useNavigate();

  // Data states
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [issueTypeFilter, setIssueTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Quick stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    high_priority: 0,
  });

  // Fetch Tickets from API using Axios
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (issueTypeFilter !== "all") params.issueType = issueTypeFilter;

      const res = await api.get("/support/admin/tickets", { params });

      if (res.data?.success) {
        setTickets(res.data.tickets || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load admin support tickets:", err);
      toast.error(
        err.response?.data?.message || "Failed to load support tickets"
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, priorityFilter, issueTypeFilter]);

  // Fetch Stats Overview from dedicated backend stats endpoint
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/support/admin/tickets/stats");
      if (res.data?.success && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (e) {
      console.error("Failed to load ticket statistics:", e);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Socket.IO Real-time updates
  useEffect(() => {
    const handleTicketUpdate = () => {
      fetchTickets();
      fetchStats();
    };

    socket.on("support_ticket_created", handleTicketUpdate);
    socket.on("support_ticket_update", handleTicketUpdate);

    return () => {
      socket.off("support_ticket_created", handleTicketUpdate);
      socket.off("support_ticket_update", handleTicketUpdate);
    };
  }, [fetchTickets, fetchStats]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setIssueTypeFilter("all");
    setPage(1);
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

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={embedded ? "support-embedded-tickets" : "support-admin-container"}>
      {/* 1. Header (if not embedded) */}
      {!embedded && (
        <div className="support-admin-header">
          <div className="support-admin-title-group">
            <h1>Customer Support Tickets</h1>
            <p>
              Review, manage, and respond to incoming customer complaints, issues, and inquiries.
            </p>
          </div>
          <div className="support-admin-header-actions">
            <button
              type="button"
              className="support-btn-secondary"
              onClick={() => {
                fetchTickets();
                fetchStats();
                toast.success("Tickets refreshed");
              }}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>
      )}

      {/* 2. Overview Stats Grid */}
      {/* 2. Overview Stats Grid (Step 13.1: Total, Open, In Progress, Resolved, Closed, High Priority) */}
      <div className="support-stats-grid">
        <div
          className={`support-stat-card clickable ${statusFilter === "all" && priorityFilter === "all" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("all");
            setPriorityFilter("all");
            setPage(1);
          }}
          title="Click to view all tickets"
        >
          <div className="support-stat-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
            <FiLifeBuoy />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
        </div>

        <div
          className={`support-stat-card clickable ${statusFilter === "open" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("open");
            setPriorityFilter("all");
            setPage(1);
          }}
          title="Click to filter Open tickets"
        >
          <div className="support-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <FiAlertCircle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.open}</div>
            <div className="stat-label">Open Tickets</div>
          </div>
        </div>

        <div
          className={`support-stat-card clickable ${statusFilter === "in_progress" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("in_progress");
            setPriorityFilter("all");
            setPage(1);
          }}
          title="Click to filter In Progress tickets"
        >
          <div className="support-stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <FiClock />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.in_progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div
          className={`support-stat-card clickable ${statusFilter === "resolved" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("resolved");
            setPriorityFilter("all");
            setPage(1);
          }}
          title="Click to filter Resolved tickets"
        >
          <div className="support-stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <FiCheckCircle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div
          className={`support-stat-card clickable ${statusFilter === "closed" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("closed");
            setPriorityFilter("all");
            setPage(1);
          }}
          title="Click to filter Closed tickets"
        >
          <div className="support-stat-icon" style={{ background: "#f1f5f9", color: "#64748b" }}>
            <FiXCircle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.closed}</div>
            <div className="stat-label">Closed</div>
          </div>
        </div>

        <div
          className={`support-stat-card clickable ${priorityFilter === "high" ? "active" : ""}`}
          onClick={() => {
            setPriorityFilter("high");
            setPage(1);
          }}
          title="Click to filter High Priority tickets"
        >
          <div className="support-stat-icon" style={{ background: "#ffe4e6", color: "#e11d48" }}>
            <FiAlertTriangle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.high_priority}</div>
            <div className="stat-label">High Priority</div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="support-toolbar">
        <form onSubmit={handleSearchSubmit} className="support-search-wrapper">
          <FiSearch className="support-search-icon" />
          <input
            type="text"
            className="support-search-input"
            placeholder="Search by Ticket ID, Customer, Subject, or Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="support-filter-group">
          <select
            className="support-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="support-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="support-select"
            value={issueTypeFilter}
            onChange={(e) => {
              setIssueTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            {ISSUE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="support-btn-secondary"
            onClick={() => {
              fetchTickets();
              fetchStats();
              toast.success("Tickets refreshed");
            }}
            title="Refresh tickets"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          {(search || statusFilter !== "all" || priorityFilter !== "all" || issueTypeFilter !== "all") && (
            <button
              type="button"
              className="support-btn-secondary"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Tickets Table Card */}
      <div className="support-table-card">
        <div className="support-table-responsive">
          {loading ? (
            <div className="support-empty-state">
              <div className="support-spinner" />
              <p>Loading support tickets...</p>
            </div>
          ) : tickets.length > 0 ? (
            <table className="support-table support-tickets-table">
              <thead>
                <tr>
                  <th style={{ width: "95px" }}>Ticket ID</th>
                  <th style={{ width: "130px" }}>Customer</th>
                  <th>Subject</th>
                  <th style={{ width: "75px" }}>Issue</th>
                  <th style={{ width: "75px" }}>Order</th>
                  <th style={{ width: "70px" }}>Priority</th>
                  <th style={{ width: "95px" }}>Status</th>
                  <th style={{ width: "85px" }}>Date</th>
                  <th style={{ textAlign: "right", width: "65px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
              {tickets.map((ticket) => {
                const customerName = ticket.user?.name || ticket.guestName || "Guest Customer";
                const customerEmail = ticket.user?.email || ticket.guestEmail || "";
                const displayCode = ticket.ticketId || `#${(ticket._id || "").slice(-8).toUpperCase()}`;

                return (
                  <tr
                    key={ticket._id}
                    onClick={() => navigate(`/admin/support/tickets/${ticket._id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className="support-ticket-id-pill" title={displayCode}>
                        {displayCode}
                      </span>
                    </td>
                    <td>
                      <div className="support-customer-col">
                        <strong className="customer-name" title={customerName}>{customerName}</strong>
                        {customerEmail && (
                          <span className="customer-email" title={customerEmail}>{customerEmail}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="support-subject-col" title={ticket.subject}>
                        <strong>{ticket.subject}</strong>
                        {ticket.adminResponse && (
                          <span className="support-responded-indicator">
                            <FiCheckCircle /> Replied
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="support-issue-type-tag">
                        {ticket.issueType || "Other"}
                      </span>
                    </td>
                    <td>
                      {ticket.order ? (
                        <span className="support-order-tag" title={`Order #${(ticket.order._id || ticket.order).toString().toUpperCase()}`}>
                          <FiPackage /> #{(ticket.order._id || ticket.order).toString().slice(-6).toUpperCase()}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td>{getPriorityBadge(ticket.priority)}</td>
                    <td>{getStatusBadge(ticket.status)}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "11.5px", color: "#64748b" }}>
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="support-action-btn view"
                        onClick={() => navigate(`/admin/support/tickets/${ticket._id}`)}
                        title="View and respond to ticket"
                      >
                        <FiEye /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="support-empty-state">
            <FiLifeBuoy style={{ fontSize: 44, color: "#cbd5e1", marginBottom: 12 }} />
            <h3>No Support Tickets Found</h3>
            <p>
              {search || statusFilter !== "all" || priorityFilter !== "all" || issueTypeFilter !== "all"
                ? "No support tickets match the current filters. Try resetting the search filters."
                : "No customer support requests have been submitted yet."}
            </p>
          </div>
        )}
        </div>

        {/* 5. Pagination */}
        {totalPages > 1 && (
          <div className="support-pagination-bar">
            <span className="support-pagination-info">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tickets
            </span>
            <div className="support-pagination-buttons">
              <button
                type="button"
                className="support-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="support-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="support-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
