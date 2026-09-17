import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  MdSupportAgent,
  MdRefresh,
  MdSearch,
  MdFilterList,
  MdCheckCircle,
  MdHourglassTop,
  MdPendingActions,
  MdClose,
  MdPerson,
  MdEmail,
  MdPhone,
  MdShoppingBag,
  MdCalendarToday,
} from "react-icons/md";
import api from "../api/axios";
import socket from "../socket/socket";
import "../styles/SupportTickets.css";

const STATUS_FILTERS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const CATEGORY_FILTERS = [
  { value: "ALL", label: "All Categories" },
  { value: "order", label: "Order Tracking & Delivery" },
  { value: "return_refund", label: "Returns & Refunds" },
  { value: "payment", label: "Payment & Billing" },
  { value: "warranty", label: "Warranty & Repair" },
  { value: "product", label: "Product & Sports Gear" },
  { value: "account", label: "Account & Login" },
  { value: "general", label: "General Inquiries" },
];

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Manage Ticket Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState("OPEN");
  const [modalPriority, setModalPriority] = useState("MEDIUM");
  const [modalAdminNotes, setModalAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/ai/support-tickets", { params });
      if (res.data && res.data.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error("Fetch support tickets error:", err);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time socket events
  useEffect(() => {
    const handleTicketCreated = (data) => {
      toast.success(
        `🚨 New Support Ticket: #${data?.ticket?.ticketId || "NEW"}!`,
        { icon: "🎫", duration: 5000 }
      );
      fetchTickets();
    };

    const handleTicketUpdated = (data) => {
      fetchTickets();
    };

    socket.on("support_ticket_created", handleTicketCreated);
    socket.on("support_ticket_updated", handleTicketUpdated);

    return () => {
      socket.off("support_ticket_created", handleTicketCreated);
      socket.off("support_ticket_updated", handleTicketUpdated);
    };
  }, [fetchTickets]);

  // Open Manage Modal
  const openManageModal = (ticket) => {
    setSelectedTicket(ticket);
    setModalStatus(ticket.status || "OPEN");
    setModalPriority(ticket.priority || "MEDIUM");
    setModalAdminNotes(ticket.adminNotes || "");
    setModalOpen(true);
  };

  // Close Modal
  const closeModal = () => {
    setSelectedTicket(null);
    setModalOpen(false);
  };

  // Update Ticket Status & Notes
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket || updating) return;

    setUpdating(true);
    try {
      const res = await api.patch(`/ai/support-ticket/${selectedTicket._id}`, {
        status: modalStatus,
        priority: modalPriority,
        adminNotes: modalAdminNotes,
      });

      if (res.data && res.data.success) {
        toast.success(`Ticket #${selectedTicket.ticketId} updated successfully`);
        closeModal();
        fetchTickets();
      } else {
        toast.error(res.data?.message || "Failed to update ticket");
      }
    } catch (err) {
      console.error("Update ticket error:", err);
      toast.error("Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  // Stats calculation
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED"
  ).length;

  return (
    <div className="support-tickets-container">
      {/* HEADER */}
      <div className="support-tickets-header">
        <div className="support-title-box">
          <div className="support-icon-badge">
            <MdSupportAgent />
          </div>
          <div>
            <h1>Customer Support Tickets</h1>
            <p className="support-sub">
              Manage tickets escalated via Decathlon AI Chatbot and direct customer requests
            </p>
          </div>
        </div>

        <div className="support-header-actions">
          <button
            type="button"
            className="support-refresh-btn"
            onClick={fetchTickets}
            title="Refresh Tickets"
          >
            <MdRefresh className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="support-metrics-grid">
        <div className="support-metric-card total">
          <div className="metric-icon">
            <MdSupportAgent />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Tickets</span>
            <span className="metric-value">{totalCount}</span>
          </div>
        </div>

        <div className="support-metric-card open">
          <div className="metric-icon">
            <MdPendingActions />
          </div>
          <div className="metric-info">
            <span className="metric-label">Needs Response (Open)</span>
            <span className="metric-value">{openCount}</span>
          </div>
        </div>

        <div className="support-metric-card in-progress">
          <div className="metric-icon">
            <MdHourglassTop />
          </div>
          <div className="metric-info">
            <span className="metric-label">In Progress</span>
            <span className="metric-value">{inProgressCount}</span>
          </div>
        </div>

        <div className="support-metric-card resolved">
          <div className="metric-icon">
            <MdCheckCircle />
          </div>
          <div className="metric-info">
            <span className="metric-label">Resolved / Closed</span>
            <span className="metric-value">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="support-controls-card">
        <div className="support-search-wrapper">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by ticket ID, customer name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
            >
              <MdClose />
            </button>
          )}
        </div>

        <div className="support-filter-group">
          <div className="filter-select-wrapper">
            <MdFilterList className="select-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {CATEGORY_FILTERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TICKETS TABLE / LIST */}
      <div className="support-table-card">
        {loading ? (
          <div className="support-loading-state">
            <div className="spinner"></div>
            <p>Loading customer support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="support-empty-state">
            <MdSupportAgent className="empty-icon" />
            <h3>No Support Tickets Found</h3>
            <p>
              {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
                ? "Try adjusting your filters or search terms."
                : "Customer escalations from Decathlon AI will appear here automatically in real time."}
            </p>
          </div>
        ) : (
          <div className="support-table-responsive">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subject & Details</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const customerName =
                    t.user?.name || t.guestName || "Guest Customer";
                  const customerEmail =
                    t.user?.email || t.guestEmail || "No email";
                  const isGuest = !t.user;

                  return (
                    <tr key={t._id} className={`status-row-${t.status.toLowerCase()}`}>
                      <td>
                        <span className="ticket-id-tag">#{t.ticketId}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{customerName}</span>
                          <span className="customer-sub">
                            {customerEmail} {isGuest && <em className="guest-badge">Guest</em>}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`category-tag category-${t.category}`}>
                          {t.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div className="subject-cell">
                          <strong className="ticket-subject">{t.subject}</strong>
                          <p className="ticket-msg-preview">{t.message}</p>
                          {t.adminNotes && (
                            <span className="admin-note-indicator">
                              📝 Notes: {t.adminNotes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`priority-pill priority-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-${t.status.toLowerCase()}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(t.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <span className="time-sub">
                            {new Date(t.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="manage-ticket-btn"
                          onClick={() => openManageModal(t)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANAGE TICKET MODAL */}
      {modalOpen && selectedTicket && (
        <div className="support-modal-backdrop" onClick={closeModal}>
          <div
            className="support-modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="support-modal-header">
              <div className="modal-title-left">
                <h2>Manage Support Ticket</h2>
                <span className="modal-ticket-id">#{selectedTicket.ticketId}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} className="support-modal-body">
              {/* CUSTOMER INFO BOX */}
              <div className="modal-info-section">
                <h3>Customer Details</h3>
                <div className="customer-info-grid">
                  <div className="info-item">
                    <MdPerson className="info-icon" />
                    <span>
                      <strong>Name:</strong>{" "}
                      {selectedTicket.user?.name || selectedTicket.guestName || "Guest User"}
                    </span>
                  </div>
                  <div className="info-item">
                    <MdEmail className="info-icon" />
                    <span>
                      <strong>Email:</strong>{" "}
                      {selectedTicket.user?.email || selectedTicket.guestEmail || "N/A"}
                    </span>
                  </div>
                  {selectedTicket.user?.phone && (
                    <div className="info-item">
                      <MdPhone className="info-icon" />
                      <span>
                        <strong>Phone:</strong> {selectedTicket.user.phone}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <MdCalendarToday className="info-icon" />
                    <span>
                      <strong>Created:</strong>{" "}
                      {new Date(selectedTicket.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* TICKET DETAILS BOX */}
              <div className="modal-info-section">
                <h3>Customer Message</h3>
                <div className="customer-message-box">
                  <div className="ticket-subject-title">
                    {selectedTicket.subject}
                  </div>
                  <p className="ticket-full-message">{selectedTicket.message}</p>
                </div>
              </div>

              {/* LINKED ORDER (IF ATTACHED) */}
              {selectedTicket.order && (
                <div className="modal-info-section">
                  <h3>Linked Order</h3>
                  <div className="linked-order-box">
                    <MdShoppingBag className="order-box-icon" />
                    <div>
                      <div>
                        Order #
                        {String(selectedTicket.order._id || selectedTicket.order)
                          .slice(-8)
                          .toUpperCase()}
                      </div>
                      <div className="order-sub-text">
                        Status: {selectedTicket.order.orderStatus || "N/A"} • Amount: ₹
                        {selectedTicket.order.totalAmount || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MANAGEMENT CONTROLS */}
              <div className="modal-controls-grid">
                <div className="control-field">
                  <label>Resolution Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                  >
                    <option value="OPEN">Open (Awaiting Executive)</option>
                    <option value="IN_PROGRESS">In Progress (Handling)</option>
                    <option value="RESOLVED">Resolved (Issue Addressed)</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div className="control-field">
                  <label>Priority Level</label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* INTERNAL ADMIN RESOLUTION NOTES */}
              <div className="control-field full-width">
                <label>Admin & Resolution Notes (Internal)</label>
                <textarea
                  rows={4}
                  placeholder="Document actions taken, customer communication, refund transaction IDs, or return status notes..."
                  value={modalAdminNotes}
                  onChange={(e) => setModalAdminNotes(e.target.value)}
                />
              </div>

              <div className="support-modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={closeModal}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-save-btn"
                  disabled={updating}
                >
                  {updating ? "Saving Changes..." : "Save Resolution & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
