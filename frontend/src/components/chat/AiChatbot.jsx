import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  IoClose,
  IoSend,
  IoRefreshOutline,
  IoChevronForward,
  IoLockClosedOutline,
  IoPersonCircleOutline,
  IoCallOutline,
  IoMailOutline,
  IoChatbubbleEllipses,
} from "react-icons/io5";
import { MdOutlineSupportAgent, MdOutlineLocalShipping } from "react-icons/md";
import api from "../../api/axios";
import "../../styles/components/ai-chatbot.css";

const GUEST_STORAGE_KEY = "decathlon_ai_chat_guest";
const getUserStorageKey = (userId) =>
  `decathlon_ai_chat_user_${userId || "guest"}`;

const QUICK_ACTIONS = [
  {
    id: "find",
    icon: "🔍",
    label: "Find a Product",
    prompt: "Find sports gear and recommendations",
  },
  {
    id: "track",
    icon: "📦",
    label: "Track My Order",
    prompt: "Where is my order? Track my order status",
  },
  {
    id: "return",
    icon: "🔄",
    label: "Return a Product",
    prompt: "How do I return or exchange a product?",
  },
  {
    id: "refund",
    icon: "💰",
    label: "Refund Status",
    prompt: "What is the status of my refund?",
  },
  {
    id: "payment",
    icon: "💳",
    label: "Payment Help",
    prompt: "Payment options and failed transaction help",
  },
  {
    id: "warranty",
    icon: "🛡️",
    label: "Warranty",
    prompt: "What is the Decathlon warranty policy on products?",
  },
  {
    id: "account",
    icon: "👤",
    label: "Account Help",
    prompt: "How to update my account details and address?",
  },
  {
    id: "support",
    icon: "💬",
    label: "Talk to Support",
    prompt: "I want to talk to a human support agent",
  },
];

const INITIAL_SUGGESTIONS = [
  "Find beginner cycle",
  "Waterproof shoes under ₹4,000",
  "Where is my order?",
  "What is your return policy?",
  "2-year warranty details",
];

const INITIAL_MESSAGE = {
  sender: "ai",
  text: "Hello! 👋 I'm your **Decathlon Sports AI Assistant**.\n\nI can help you find equipment for 60+ sports, recommend sizes, track your orders, and answer questions about returns or warranty.\n\nWhat are you looking for today?",
  type: "welcome",
  products: [],
  orders: [],
  suggestions: INITIAL_SUGGESTIONS,
  timestamp: new Date().toISOString(),
};

const AiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("user");
      if (token && stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ticket creation inline state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [messages, setMessages] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("user");
      if (token && stored) {
        const u = JSON.parse(stored);
        const uid = u?.id || u?._id;
        const cached = localStorage.getItem(getUserStorageKey(uid));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } else {
        const guest = sessionStorage.getItem(GUEST_STORAGE_KEY);
        if (guest) {
          const parsed = JSON.parse(guest);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}
    return [INITIAL_MESSAGE];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Show a welcome tooltip briefly on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
      const hideTimer = setTimeout(() => setShowTooltip(false), 8000);
      return () => clearTimeout(hideTimer);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Sync currentUser on auth change (login / logout)
  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const token = localStorage.getItem("token");
        const stored = localStorage.getItem("user");
        if (token && stored) {
          setCurrentUser(JSON.parse(stored));
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        setCurrentUser(null);
      }
    };

    window.addEventListener("authChanged", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("authChanged", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Fetch or reset chat history whenever auth status changes (e.g. after login)
  useEffect(() => {
    if (currentUser) {
      const uid = currentUser.id || currentUser._id;
      // 1. Instant optimistic restore from local cache
      try {
        const cached = localStorage.getItem(getUserStorageKey(uid));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {}

      // 2. Fetch fresh persistent history from MongoDB
      const fetchHistory = async () => {
        try {
          setLoadingHistory(true);
          const response = await api.get("/ai/history");
          if (
            response.data &&
            response.data.success &&
            Array.isArray(response.data.messages)
          ) {
            if (response.data.messages.length > 0) {
              setMessages(response.data.messages);
              localStorage.setItem(
                getUserStorageKey(uid),
                JSON.stringify(response.data.messages),
              );
            } else {
              setMessages([INITIAL_MESSAGE]);
            }
          }
        } catch (err) {
          console.error("Failed to load user chat history:", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    } else {
      // User is logged out -> clear chat back to initial message
      setMessages([INITIAL_MESSAGE]);
      setLoadingHistory(false);
    }
  }, [currentUser]);

  // Persist conversation updates
  useEffect(() => {
    try {
      if (currentUser) {
        const uid = currentUser.id || currentUser._id;
        localStorage.setItem(getUserStorageKey(uid), JSON.stringify(messages));
      } else {
        sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {}
  }, [messages, currentUser]);

  // Scroll to bottom when messages update
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages, scrollToBottom]);

  const handleToggleChat = () => {
    setIsOpen((prev) => !prev);
    setShowTooltip(false);
    setHasUnread(false);
  };

  const handleResetChat = async () => {
    if (window.confirm("Clear this conversation?")) {
      setMessages([INITIAL_MESSAGE]);
      if (currentUser) {
        const uid = currentUser.id || currentUser._id;
        localStorage.removeItem(getUserStorageKey(uid));
        try {
          await api.delete("/ai/history");
        } catch (e) {
          console.error("Failed to clear server chat history:", e);
        }
      } else {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
      }
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    setInputMessage("");

    // Add user message
    const userMsg = {
      sender: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      const response = await api.post("/ai/chat", {
        message: query,
        history: newHistory.slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      });

      if (response.data && response.data.success) {
        const aiMsg = {
          sender: "ai",
          type: response.data.type || "faq",
          text: response.data.reply || "Here is what I found for you:",
          products: response.data.products || [],
          orders: response.data.orders || [],
          ticket: response.data.ticket || null,
          suggestions: response.data.suggestions || [],
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(response.data?.message || "Failed to get response");
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorMsg = {
        sender: "ai",
        text: "Sorry, I had trouble connecting to the sports assistant. Please try again in a moment!",
        products: [],
        orders: [],
        suggestions: ["Find a Product", "Track My Order", "Return a Product"],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Support Ticket submission handler
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || submittingTicket)
      return;

    setSubmittingTicket(true);
    try {
      const payload = {
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        priority: "MEDIUM",
        guestName: currentUser ? currentUser.name || "" : guestName.trim(),
        guestEmail: currentUser ? currentUser.email || "" : guestEmail.trim(),
      };

      const res = await api.post("/ai/support-ticket", payload);
      if (res.data && res.data.success) {
        const ticket = res.data.ticket;
        const confirmMsg = {
          sender: "ai",
          type: "human_support",
          text: `✅ **Support Ticket Created!**\n\nYour Ticket ID is **#${ticket?.ticketId || "CONFIRMED"}**.\n\nOur Decathlon customer support team has received your request and will follow up with you promptly.`,
          ticket,
          products: [],
          orders: [],
          suggestions: ["Track My Order", "Return a Product", "Find a Product"],
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMsg]);
        setShowTicketForm(false);
        setTicketSubject("");
        setTicketMessage("");
      } else {
        alert(res.data?.message || "Could not create support ticket");
      }
    } catch (err) {
      console.error("Failed to submit support ticket:", err);
      alert(
        "Failed to submit ticket. Please check your connection or contact care.india@decathlon.com",
      );
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatPrice = (val) => {
    if (!val && val !== 0) return "";
    return `₹${Number(val).toLocaleString("en-IN")}`;
  };

  const getImageUrl = (image) => {
    if (!image) return "https://via.placeholder.com/300?text=Decathlon";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:"))
    ) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    return `${backendUrl}/${String(image).replace(/^\//, "")}`;
  };

  // Safe markdown formatter for bold, links, code blocks, lists
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      // Bullet list item
      if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        const content = line.trim().replace(/^[-•]\s+/, "");
        return (
          <li key={lineIdx} className="ai-chat-bullet">
            {parseInlineMarkdown(content)}
          </li>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={lineIdx} className="ai-chat-line-break" />;
      }

      return (
        <p key={lineIdx} className="ai-chat-paragraph">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (str) => {
    if (!str) return "";

    // Split on markdown link [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const label = match[1];
      const href = match[2];
      parts.push(
        href.startsWith("/") ? (
          <Link
            key={`link-${match.index}`}
            to={href}
            onClick={() => setIsOpen(false)}
            className="ai-chat-internal-link"
          >
            {label}
          </Link>
        ) : (
          <a
            key={`link-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="ai-chat-external-link"
          >
            {label}
          </a>
        ),
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.map((part, idx) => {
      if (typeof part !== "string") return part;

      // Handle **bold** and `code`
      const boldSegments = part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return boldSegments.map((seg, sIdx) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={`b-${idx}-${sIdx}`}>
              {seg.substring(2, seg.length - 2)}
            </strong>
          );
        }
        if (seg.startsWith("`") && seg.endsWith("`")) {
          return (
            <code key={`c-${idx}-${sIdx}`} className="ai-chat-code-inline">
              {seg.substring(1, seg.length - 1)}
            </code>
          );
        }
        return seg;
      });
    });
  };

  return (
    <div className="ai-chatbot-container">
      {/* TOOLTIP GREETING */}
      {showTooltip && !isOpen && (
        <div
          className="ai-chat-fab-tooltip"
          onClick={handleToggleChat}
          role="button"
          tabIndex={0}
        >
          <span>
            Need help with gear, orders, or returns? Ask Decathlon AI!
          </span>
          <button
            type="button"
            className="ai-tooltip-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            aria-label="Close tooltip"
          >
            <IoClose />
          </button>
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button
        type="button"
        className={`ai-chat-fab ${isOpen ? "active" : ""}`}
        onClick={handleToggleChat}
        aria-label={
          isOpen ? "Close AI Sports Assistant" : "Open AI Sports Assistant"
        }
        title="Decathlon AI Sports Assistant"
      >
        {isOpen ? (
          <IoClose className="ai-fab-icon close-icon" />
        ) : (
          <>
            <IoChatbubbleEllipses className="ai-fab-icon" />
            {hasUnread && <span className="ai-fab-badge"></span>}
          </>
        )}
      </button>

      {/* CHAT WINDOW MODAL */}
      {isOpen && (
        <div
          className="ai-chat-window"
          role="dialog"
          aria-label="Decathlon AI Chat Assistant"
        >
          {/* HEADER */}
          <div className="ai-chat-header">
            <div className="ai-header-brand">
              <div className="ai-avatar-circle">
                <IoChatbubbleEllipses className="ai-avatar-icon" />
              </div>
              <div className="ai-header-text">
                <div className="ai-header-title">
                  <span>Decathlon AI</span>
                  <span className="ai-badge-pill">Help & Support</span>
                </div>
                <div className="ai-header-status">
                  <span className="ai-status-dot"></span>
                  <span>Online • Live Database Grounded</span>
                </div>
                {currentUser && (
                  <div
                    className="ai-auth-user-tag"
                    title={`Logged in as ${currentUser.name || currentUser.email}`}
                  >
                    <IoPersonCircleOutline className="ai-user-icon" />
                    <span>
                      {currentUser.name
                        ? currentUser.name.split(" ")[0]
                        : "Account"}{" "}
                      • History & Orders Synced
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="ai-header-actions">
              <button
                type="button"
                className="ai-action-btn"
                onClick={handleResetChat}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <IoRefreshOutline />
              </button>
              <button
                type="button"
                className="ai-action-btn"
                onClick={handleToggleChat}
                title="Close chat"
                aria-label="Close chat"
              >
                <IoClose />
              </button>
            </div>
          </div>

          {/* AUTH BANNER: PROMPT FOR LOGIN TO SAVE / VIEW ORDER DATA */}
          {!currentUser && (
            <div className="ai-auth-banner">
              <div className="ai-auth-banner-text">
                <IoLockClosedOutline className="ai-auth-lock-icon" />
                <span>
                  <strong>Sign in</strong> to track live orders & save chat
                  history.
                </span>
              </div>
              <Link
                to="/login"
                className="ai-auth-banner-btn"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
            </div>
          )}

          {/* MESSAGES BODY */}
          <div className="ai-chat-body">
            {loadingHistory && (
              <div style={{ textAlign: "center" }}>
                <span className="ai-history-loader-badge">
                  🔄 Loading your saved conversation...
                </span>
              </div>
            )}
            {messages.map((msg, index) => {
              const isAi = msg.sender === "ai";
              return (
                <div
                  key={index}
                  className={`ai-message-row ${isAi ? "ai-row" : "user-row"}`}
                >
                  {isAi && (
                    <div className="ai-message-avatar">
                      <IoChatbubbleEllipses />
                    </div>
                  )}

                  <div
                    className={`ai-message-bubble ${isAi ? "ai-bubble" : "user-bubble"}`}
                  >
                    <div className="ai-bubble-content">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* WELCOME QUICK ACTION BUTTONS (ON INITIAL MESSAGE) */}
                    {isAi && index === 0 && (
                      <div className="ai-quick-actions-section">
                        <div className="ai-quick-actions-title">
                          ⚡ Popular Help & Sports Actions
                        </div>
                        <div className="ai-quick-actions-grid">
                          {QUICK_ACTIONS.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              className="ai-quick-action-btn"
                              onClick={() => handleSendMessage(action.prompt)}
                            >
                              <span className="ai-quick-icon">
                                {action.icon}
                              </span>
                              <span className="ai-quick-label">
                                {action.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EMBEDDED ORDER STATUS CARDS */}
                    {isAi && msg.orders && msg.orders.length > 0 && (
                      <div className="ai-orders-container">
                        <div className="ai-orders-header">
                          <MdOutlineLocalShipping className="ai-orders-icon" />
                          <span>
                            Your Orders in Database ({msg.orders.length})
                          </span>
                        </div>
                        <div className="ai-orders-list">
                          {msg.orders.map((ord, oIdx) => {
                            const rawStatus = (
                              ord.orderStatus || "processing"
                            ).toLowerCase();
                            const statusBadgeClass = `status-${rawStatus.replace(/\s+/g, "-")}`;
                            return (
                              <div
                                key={ord.fullId || oIdx}
                                className="ai-order-card"
                              >
                                <div className="ai-order-card-header">
                                  <div className="ai-order-meta">
                                    <span className="ai-order-id">
                                      {ord.orderId}
                                    </span>
                                    <span className="ai-order-date">
                                      {ord.date}
                                    </span>
                                  </div>
                                  <span
                                    className={`ai-order-status-badge ${statusBadgeClass}`}
                                  >
                                    {ord.orderStatus}
                                  </span>
                                </div>

                                <div className="ai-order-delivery-banner">
                                  <MdOutlineLocalShipping className="ai-delivery-icon" />
                                  <span>{ord.estimatedDelivery}</span>
                                </div>

                                <div className="ai-order-items">
                                  {(ord.items || [])
                                    .slice(0, 2)
                                    .map((item, iIdx) => (
                                      <div
                                        key={iIdx}
                                        className="ai-order-item-row"
                                      >
                                        <img
                                          src={getImageUrl(item.image)}
                                          alt={item.name}
                                          className="ai-order-item-img"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src =
                                              "https://via.placeholder.com/60?text=Gear";
                                          }}
                                        />
                                        <div className="ai-order-item-info">
                                          <div className="ai-order-item-brand">
                                            {item.brand}
                                          </div>
                                          <div className="ai-order-item-name">
                                            {item.name}
                                          </div>
                                          <div className="ai-order-item-qty">
                                            Qty: {item.quantity} •{" "}
                                            {formatPrice(item.price)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  {(ord.items?.length || 0) > 2 && (
                                    <div className="ai-order-more-items">
                                      +{ord.items.length - 2} more item(s) in
                                      this order
                                    </div>
                                  )}
                                </div>

                                <div className="ai-order-footer">
                                  <div className="ai-order-total-box">
                                    <span className="ai-order-total-label">
                                      Total Amount:
                                    </span>
                                    <span className="ai-order-total-val">
                                      {formatPrice(ord.totalAmount)}
                                    </span>
                                  </div>
                                  <div className="ai-order-actions">
                                    <Link
                                      to="/account/orders-returns"
                                      className="ai-order-btn-primary"
                                      onClick={() => setIsOpen(false)}
                                    >
                                      View Order <IoChevronForward />
                                    </Link>
                                    <button
                                      type="button"
                                      className="ai-order-btn-secondary"
                                      onClick={() =>
                                        handleSendMessage(
                                          `How do I return items in order ${ord.orderId}?`,
                                        )
                                      }
                                    >
                                      Return Help
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* EMBEDDED PRODUCT RECOMMENDATION CARDS */}
                    {isAi && msg.products && msg.products.length > 0 && (
                      <div className="ai-products-container">
                        <div className="ai-products-header">
                          <span>Recommended Sports Gear</span>
                          <span className="ai-products-count">
                            ({msg.products.length})
                          </span>
                        </div>
                        <div className="ai-products-scroll">
                          {msg.products.map((prod) => (
                            <div key={prod.id} className="ai-product-card">
                              <div className="ai-product-img-box">
                                {prod.onSale && (
                                  <span className="ai-sale-badge">Sale</span>
                                )}
                                <img
                                  src={getImageUrl(prod.image)}
                                  alt={prod.name}
                                  loading="lazy"
                                />
                              </div>

                              <div className="ai-product-details">
                                <div className="ai-product-brand">
                                  {prod.brand}
                                </div>
                                <div
                                  className="ai-product-title"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </div>

                                <div className="ai-product-pricing">
                                  <span className="ai-price">
                                    {formatPrice(prod.price)}
                                  </span>
                                  {prod.mrp && prod.mrp > prod.price && (
                                    <span className="ai-mrp">
                                      {formatPrice(prod.mrp)}
                                    </span>
                                  )}
                                  {prod.discountPercent > 0 && (
                                    <span className="ai-discount-tag">
                                      {prod.discountPercent}% off
                                    </span>
                                  )}
                                </div>

                                <Link
                                  to={`/product/${prod.id}`}
                                  className="ai-view-btn"
                                  onClick={() => setIsOpen(false)}
                                >
                                  View Gear <IoChevronForward />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HUMAN SUPPORT ESCALATION CARD */}
                    {isAi && (msg.type === "human_support" || msg.ticket) && (
                      <div className="ai-support-escalation-card">
                        <div className="ai-support-card-header">
                          <div className="ai-support-icon-circle">
                            <MdOutlineSupportAgent />
                          </div>
                          <div>
                            <div className="ai-support-title">
                              Decathlon Customer Care
                            </div>
                            <div className="ai-support-sub">
                              Mon–Sun 9:00 AM – 8:00 PM IST
                            </div>
                          </div>
                        </div>

                        {msg.ticket ? (
                          <div className="ai-ticket-confirmed-box">
                            <div className="ai-ticket-badge-row">
                              <span className="ai-ticket-pill">
                                Ticket #{msg.ticket.ticketId}
                              </span>
                              <span className="ai-ticket-status-pill">
                                {msg.ticket.status || "OPEN"}
                              </span>
                            </div>
                            <p className="ai-ticket-note">
                              Your support request is logged in our system. A
                              sports specialist will contact you shortly!
                            </p>
                          </div>
                        ) : (
                          <div className="ai-support-card-actions">
                            <button
                              type="button"
                              className="ai-support-ticket-btn"
                              onClick={() => setShowTicketForm((prev) => !prev)}
                            >
                              {showTicketForm
                                ? "✖ Cancel Ticket Form"
                                : "🎫 Open Official Support Ticket"}
                            </button>

                            {showTicketForm && (
                              <form
                                className="ai-inline-ticket-form"
                                onSubmit={handleTicketSubmit}
                              >
                                {!currentUser && (
                                  <>
                                    <input
                                      type="text"
                                      placeholder="Your Name"
                                      value={guestName}
                                      onChange={(e) =>
                                        setGuestName(e.target.value)
                                      }
                                      className="ai-ticket-input"
                                      required
                                    />
                                    <input
                                      type="email"
                                      placeholder="Your Email Address"
                                      value={guestEmail}
                                      onChange={(e) =>
                                        setGuestEmail(e.target.value)
                                      }
                                      className="ai-ticket-input"
                                      required
                                    />
                                  </>
                                )}
                                <input
                                  type="text"
                                  placeholder="Subject (e.g. Order #1234 delivery inquiry)"
                                  value={ticketSubject}
                                  onChange={(e) =>
                                    setTicketSubject(e.target.value)
                                  }
                                  className="ai-ticket-input"
                                  required
                                />
                                <textarea
                                  placeholder="Please describe your issue or question in detail..."
                                  value={ticketMessage}
                                  onChange={(e) =>
                                    setTicketMessage(e.target.value)
                                  }
                                  className="ai-ticket-textarea"
                                  rows={3}
                                  required
                                />
                                <button
                                  type="submit"
                                  className="ai-ticket-submit-btn"
                                  disabled={submittingTicket}
                                >
                                  {submittingTicket
                                    ? "Submitting..."
                                    : "Submit to Support Team"}
                                </button>
                              </form>
                            )}

                            <div className="ai-support-direct-contacts">
                              <a
                                href="tel:18004251877"
                                className="ai-contact-pill"
                              >
                                <IoCallOutline /> 1800-425-1877
                              </a>
                              <a
                                href="mailto:care.india@decathlon.com"
                                className="ai-contact-pill"
                              >
                                <IoMailOutline /> care.india@decathlon.com
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUGGESTION CHIPS (LATEST MESSAGE ONLY) */}
                    {isAi &&
                      index === messages.length - 1 &&
                      msg.suggestions &&
                      msg.suggestions.length > 0 && (
                        <div className="ai-suggestions-row">
                          {msg.suggestions.map((sugg, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              className="ai-suggestion-chip"
                              onClick={() => handleSendMessage(sugg)}
                            >
                              {sugg}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            {/* TYPING INDICATOR */}
            {loading && (
              <div className="ai-message-row ai-row">
                <div className="ai-message-avatar">
                  <MdOutlineSupportAgent />
                </div>
                <div className="ai-message-bubble ai-bubble ai-typing-bubble">
                  <div className="ai-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="ai-typing-text">
                    Decathlon AI is searching live data...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR */}
          <div className="ai-chat-footer">
            <div className="ai-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="ai-chat-input"
                placeholder="Ask about cycles, sizes, order tracking, returns..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                type="button"
                className="ai-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                aria-label="Send message"
              >
                <IoSend />
              </button>
            </div>
            <div className="ai-footer-note">
              <span>Powered by Decathlon AI • Gemini 1.5 Flash Grounded</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiChatbot;
