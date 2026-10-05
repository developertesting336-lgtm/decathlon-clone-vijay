import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiShoppingBag,
  FiMessageSquare,
  FiClock,
  FiHelpCircle,
  FiExternalLink,
} from "react-icons/fi";
import SupportHeader from "./components/SupportHeader";
import SupportSearch from "./components/SupportSearch";
import SupportCategoryGrid from "./components/SupportCategoryGrid";
import SupportFAQ from "./components/SupportFAQ";
import SupportFooter from "./components/SupportFooter";
import api from "../../api/axios";
import "./Support.css";

const QUICK_TOPIC_NAMES = [
  "Orders",
  "Payments",
  "Delivery",
  "Returns & Refunds",
  "Exchange",
  "Warranty",
];

const Support = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ecommerce");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openFaqId, setOpenFaqId] = useState(null);

  // Categories list for Quick Links (Requirement 10)
  const [categories, setCategories] = useState([]);

  // User Tickets (Requirement 13)
  const [userTickets, setUserTickets] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    document.title = "Help & Support | Decathlon";
    window.scrollTo(0, 0);
  }, []);

  // Fetch categories for Quick Topic buttons (Requirement 10: must use category._id)
  useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      try {
        const res = await api.get("/support/categories");
        if (active && res.data?.success && Array.isArray(res.data?.categories)) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error("Failed to load categories for quick links:", err);
      }
    };
    fetchCats();
    return () => {
      active = false;
    };
  }, []);

  // Fetch User Support Tickets if authenticated (Step 10 Requirement)
  useEffect(() => {
    if (!token) return;
    let active = true;
    const fetchTickets = async () => {
      try {
        const res = await api.get("/support/tickets");
        if (active && res.data?.success && Array.isArray(res.data?.tickets)) {
          setUserTickets(res.data.tickets);
        }
      } catch (err) {
        // Fallback silently if endpoint has no tickets yet
      }
    };
    fetchTickets();
    return () => {
      active = false;
    };
  }, [token]);

  // Global Support Search using Axios (Step 7 Requirement #9 & Step 9 Requirement #11)
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/support/search", {
          params: {
            q: term,
          },
        });
        if (active && response.data?.success) {
          setSearchResults(response.data.results || []);
        }
      } catch (err) {
        if (active) {
          console.error("Global support search failed:", err);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleFaqToggle = (id) => {
    setOpenFaqId((prevId) => (prevId === id ? null : id));
  };

  // Requirement 2: My Orders Button navigation with authentication check
  const handleMyOrdersClick = () => {
    if (token) {
      navigate("/account/orders-returns");
    } else {
      toast.error("Please login to view your orders.");
      navigate("/login");
    }
  };

  // Requirement 8: Live Chat Integration using existing chat system
  const handleStartLiveChat = () => {
    window.dispatchEvent(new CustomEvent("openLiveChat"));
  };

  // Step 10 Requirement 9: Support Ticket Request handlers
  const handleCreateSupportRequest = () => {
    if (token) {
      navigate("/support/tickets/new");
    } else {
      toast("Please login to create a support request", { icon: "ℹ️" });
      navigate("/login");
    }
  };

  const handleViewSupportRequests = () => {
    if (token) {
      navigate("/support/tickets");
    } else {
      toast("Please login to view your support requests", { icon: "ℹ️" });
      navigate("/login");
    }
  };

  // Requirement 10: Quick link navigation using category MongoDB _id ONLY
  const handleQuickTopicClick = (topicName) => {
    if (!categories || categories.length === 0) return;
    const lowerTopic = topicName.toLowerCase();
    const matched = categories.find((cat) => {
      const name = (cat.name || "").toLowerCase();
      const icon = (cat.icon || "").toLowerCase();
      if (lowerTopic === "returns & refunds") {
        return name.includes("return") || icon.includes("return");
      }
      return name.includes(lowerTopic) || icon.includes(lowerTopic);
    });

    if (matched && matched._id) {
      navigate(`/support/category/${matched._id}`);
    } else {
      // Fallback: search term
      setSearchQuery(topicName);
    }
  };

  return (
    <div className="support-page">
      {/* 1. Header (Hamburger, Logo, E-Commerce, Organisations) */}
      <SupportHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* 2. Search Bar Section */}
      <SupportSearch
        value={searchQuery}
        onChange={(val) => setSearchQuery(val)}
        onSearch={(term) => setSearchQuery(term)}
      />

      {/* Requirement 10: Quick Links Bar (Orders, Payments, Delivery, Returns & Refunds, Exchange, Warranty) */}
      <div className="support-quick-topics-bar">
        <div className="support-quick-topics-inner">
          <span className="support-quick-topics-label">Quick Help:</span>
          <div className="support-quick-topics-pills">
            {QUICK_TOPIC_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className="support-quick-topic-chip"
                onClick={() => handleQuickTopicClick(name)}
                title={`Go to ${name} FAQs`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Global Search Results (if user has typed a search term) */}
      {searchQuery.trim() && (
        <section
          className="support-global-search-results"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "24px 20px 0",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1e293b",
                margin: 0,
              }}
            >
              {searching
                ? "Searching FAQs..."
                : `FAQ Results for "${searchQuery}" (${searchResults.length})`}
            </h3>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2b388f",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Clear search
              </button>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: "16px 20px",
                marginBottom: 32,
              }}
            >
              <SupportFAQ
                faqs={searchResults}
                openId={openFaqId}
                onToggle={handleFaqToggle}
              />
            </div>
          ) : !searching ? (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px dashed #cbd5e1",
                padding: "24px 20px",
                textAlign: "center",
                color: "#64748b",
                marginBottom: 32,
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
                No FAQ answers found matching "{searchQuery}"
              </p>
              <small>
                You can browse the matching categories below or start a live chat.
              </small>
            </div>
          ) : null}
        </section>
      )}

      {/* 4. Category Grid (navigates to /support/category/:categoryId) */}
      <main className="support-main">
        <SupportCategoryGrid searchQuery={searchQuery} />
      </main>

      {/* Requirement 1: Quick Help Section (Need help with your order? [ My Orders ] [ Start Live Chat ]) */}
      <section className="support-quick-help-section" aria-label="Order Quick Help">
        <div className="support-quick-help-container">
          <div className="support-quick-help-card">
            <div className="support-quick-help-icon-wrap">
              <FiShoppingBag />
            </div>
            <div className="support-quick-help-text">
              <h2 className="support-quick-help-title">Need help with your order?</h2>
              <p className="support-quick-help-desc">
                Get quick help with your recent orders, delivery, returns and exchanges.
              </p>
            </div>
            <div className="support-quick-help-buttons">
              <button
                type="button"
                className="support-order-btn my-orders-btn"
                onClick={handleMyOrdersClick}
                title="View your orders, tracking, and returns"
              >
                <FiShoppingBag />
                <span>My Orders</span>
              </button>
              <button
                type="button"
                className="support-order-btn live-chat-btn"
                onClick={handleStartLiveChat}
                title="Talk to Decathlon support agent or AI assistant"
              >
                <FiMessageSquare />
                <span>Start Live Chat</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Step 12.4: Still Need Help Section */}
      <section className="support-quick-help-section support-still-need-help-section" aria-label="Still Need Help">
        <div className="support-quick-help-container">
          <div className="support-quick-help-card still-help-card">
            <div className="support-quick-help-icon-wrap" style={{ background: "#eff6ff", color: "#0082c3" }}>
              <FiHelpCircle />
            </div>
            <div className="support-quick-help-text">
              <h2 className="support-quick-help-title">Still need help?</h2>
              <p className="support-quick-help-desc">
                Can't find the answer you're looking for?
              </p>
            </div>
            <div className="support-quick-help-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="support-order-btn my-orders-btn"
                onClick={handleMyOrdersClick}
                title="View your orders, tracking, and returns"
              >
                <FiShoppingBag />
                <span>My Orders</span>
              </button>
              <button
                type="button"
                className="support-order-btn my-orders-btn"
                style={{ background: "#0082c3", color: "#ffffff", borderColor: "#0082c3" }}
                onClick={handleCreateSupportRequest}
                title="Create and submit a new customer support ticket"
              >
                <FiHelpCircle />
                <span>Create Support Request</span>
              </button>
              <button
                type="button"
                className="support-order-btn live-chat-btn"
                onClick={handleStartLiveChat}
                title="Talk to Decathlon support agent or AI assistant"
              >
                <FiMessageSquare />
                <span>Start Live Chat</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Step 10: "My Support Requests" card (shown if authenticated user has submitted tickets) */}
      {token && userTickets.length > 0 && (
        <section className="support-tickets-section" aria-label="My Support Requests">
          <div className="support-tickets-container">
            <div className="support-tickets-card">
              <div className="support-tickets-header">
                <div className="support-tickets-title-group">
                  <FiHelpCircle className="support-tickets-title-icon" />
                  <div>
                    <h3 className="support-tickets-title">My Support Requests</h3>
                    <p className="support-tickets-subtitle">
                      Track resolution progress for your submitted support and payment tickets.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="support-tickets-chat-link"
                    onClick={handleViewSupportRequests}
                  >
                    View All ({userTickets.length}) <FiExternalLink />
                  </button>
                  <button
                    type="button"
                    className="support-tickets-chat-link"
                    style={{ background: "#0082c3", color: "#fff", borderColor: "#0082c3" }}
                    onClick={handleCreateSupportRequest}
                  >
                    + New Request
                  </button>
                </div>
              </div>

              <div className="support-tickets-list">
                {userTickets.slice(0, 5).map((ticket) => {
                  const targetId = ticket._id || ticket.ticketId;
                  const displayId = ticket.ticketId || (ticket._id ? `#${ticket._id.slice(-8).toUpperCase()}` : "");

                  return (
                    <div
                      key={targetId}
                      className="support-ticket-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/support/tickets/${targetId}`)}
                      title="Click to view ticket details"
                    >
                      <div className="ticket-item-main">
                        <div className="ticket-subject-row">
                          <strong className="ticket-subject">{ticket.subject}</strong>
                          <span
                            className={`ticket-status-pill ${(
                              ticket.status || "OPEN"
                            ).toLowerCase()}`}
                          >
                            {ticket.status || "OPEN"}
                          </span>
                        </div>
                        <p className="ticket-message-preview">{ticket.message}</p>
                        <div className="ticket-meta-row">
                          <span className="ticket-id-tag">
                            ID: {displayId}
                          </span>
                          {ticket.order && (
                            <span className="ticket-order-tag">
                              Order #{(ticket.order._id || ticket.order).toString().slice(-8).toUpperCase()}
                            </span>
                          )}
                          <span className="ticket-date-tag">
                            <FiClock /> {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Footer (Copyright, Contact Us button, Terms & Conditions | Privacy Policy) */}
      <SupportFooter />
    </div>
  );
};

export default Support;
