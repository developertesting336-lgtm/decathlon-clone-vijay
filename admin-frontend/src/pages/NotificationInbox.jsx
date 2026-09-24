import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MdNotificationsActive,
  MdNotificationsNone,
  MdShoppingBag,
  MdAssignmentReturn,
  MdSwapHoriz,
  MdInventory,
  MdDoneAll,
  MdRefresh,
  MdDeleteOutline,
  MdDeleteSweep,
  MdSearch,
  MdClose,
  MdFlashOn,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdOpenInNew,
  MdArrowBack,
  MdArrowForward,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../api/axios";
import socket from "../socket/socket";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../utils/pushNotifications";
import "../styles/NotificationInbox.css";

// Synthesize pleasant chime
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
};

const NotificationInbox = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab filter: 'ALL' | 'UNREAD' | 'ORDER' | 'RETURN' | 'EXCHANGE' | 'LOW_STOCK' | 'REFUND'
  const activeTab = searchParams.get("tab") || "ALL";

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats Breakdown
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    orders: 0,
    returns: 0,
    lowStock: 0,
  });

  const [pushStatus, setPushStatus] = useState("default");
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Check push permission status
  useEffect(() => {
    setPushStatus(getNotificationPermission());
  }, []);

  // Sync tab change
  const handleTabChange = (newTab) => {
    setSearchParams(newTab === "ALL" ? {} : { tab: newTab });
    setPage(1);
  };

  // Fetch notifications with filters
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "25");

      if (activeTab === "UNREAD") {
        params.append("read", "false");
      } else if (activeTab !== "ALL") {
        params.append("type", activeTab);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await api.get(`/notifications?${params.toString()}`);
      const list = res.data?.notifications || [];
      const unread = Number(res.data?.unreadCount || 0);
      const total = Number(res.data?.totalCount || list.length);

      setNotifications(list);
      setUnreadCount(unread);
      setTotalCount(total);
      setTotalPages(Number(res.data?.totalPages || 1));

      // Broadcast unread count so sidebar and bell stay in exact sync
      window.dispatchEvent(
        new CustomEvent("adminUnreadCountUpdated", { detail: unread })
      );
    } catch (err) {
      console.error("Fetch inbox notifications error:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, page]);

  // Fetch stats for all categories
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, unreadRes, orderRes, returnRes, lowStockRes] =
        await Promise.all([
          api.get("/notifications?limit=1"),
          api.get("/notifications?read=false&limit=1"),
          api.get("/notifications?type=ORDER&limit=1"),
          api.get("/notifications?type=RETURN_EXCHANGE&limit=1"),
          api.get("/notifications?type=LOW_STOCK&limit=1"),
        ]);

      setStats({
        total: Number(allRes.data?.totalCount || 0),
        unread: Number(unreadRes.data?.unreadCount || 0),
        orders: Number(orderRes.data?.totalCount || 0),
        returns: Number(returnRes.data?.totalCount || 0),
        lowStock: Number(lowStockRes.data?.totalCount || 0),
      });
    } catch (err) {
      console.warn("Could not fetch notification stats breakdown", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime Socket.IO listener
  useEffect(() => {
    const handleNewNotification = (newNotif) => {
      if (!newNotif) return;
      // Do not save or display test notifications in inbox list
      if (newNotif.isTest) return;

      playNotificationChime();

      setNotifications((prev) => {
        const exists = prev.some(
          (n) => n._id && newNotif._id && n._id.toString() === newNotif._id.toString()
        );
        if (exists) return prev;
        return [{ ...newNotif, justArrived: true }, ...prev];
      });

      setUnreadCount((prev) => {
        const updated = prev + 1;
        window.dispatchEvent(
          new CustomEvent("adminUnreadCountUpdated", { detail: updated })
        );
        return updated;
      });

      setTotalCount((prev) => prev + 1);
      fetchStats();
    };

    socket.on("admin_notification", handleNewNotification);

    return () => {
      socket.off("admin_notification", handleNewNotification);
    };
  }, [fetchStats]);

  // Mark single as read
  const handleToggleRead = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      if (!notif.read) {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => {
          const next = Math.max(prev - 1, 0);
          window.dispatchEvent(
            new CustomEvent("adminUnreadCountUpdated", { detail: next })
          );
          return next;
        });
        fetchStats();
        toast.success("Marked as read");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(
        new CustomEvent("adminUnreadCountUpdated", { detail: 0 })
      );
      fetchStats();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  // Clear read notifications
  const handleClearRead = async () => {
    if (!window.confirm("Are you sure you want to clear all read notifications?")) {
      return;
    }
    try {
      await api.delete("/notifications/clear-read");
      setNotifications((prev) => prev.filter((n) => !n.read));
      fetchNotifications();
      fetchStats();
      toast.success("Cleared read notifications");
    } catch (err) {
      toast.error("Failed to clear notifications");
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotalCount((prev) => Math.max(prev - 1, 0));
      fetchStats();
      toast.success("Notification deleted");
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  // Navigate according to notification type
  const handleActionClick = (notif) => {
    if (!notif) return;
    if (!notif.read) {
      api.patch(`/notifications/${notif._id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    switch (notif.type) {
      case "RETURN":
        navigate("/orders?tab=returns");
        break;
      case "EXCHANGE":
        navigate("/orders?tab=exchanges");
        break;
      case "ORDER":
        navigate("/orders");
        break;
      case "LOW_STOCK":
        navigate("/products");
        break;
      case "REFUND":
        navigate("/orders?tab=returns");
        break;
      default:
        navigate(notif.url || "/orders");
    }
  };

  // Trigger quick test notification
  const handleSendTestNotification = async (type = "ORDER") => {
    try {
      setSendingTest(true);
      await api.post("/notifications/test-admin", { type });
      toast.success(`Emitted test ${type.toLowerCase()} alert!`, {
        id: "test-alert-emitted",
      });
    } catch (err) {
      toast.error("Failed to trigger test notification");
    } finally {
      setSendingTest(false);
    }
  };

  // Toggle push permissions
  const handleTogglePush = async () => {
    if (pushStatus === "granted") {
      try {
        setSubscribingPush(true);
        await unsubscribeFromPushNotifications(api);
        setPushStatus("default");
        toast.success("Desktop popups disabled");
      } catch (err) {
        toast.error("Failed to unsubscribe");
      } finally {
        setSubscribingPush(false);
      }
    } else {
      try {
        setSubscribingPush(true);
        const res = await subscribeToPushNotifications(api);
        if (res.success) {
          setPushStatus("granted");
          toast.success("Desktop popups enabled! You will now receive OS alerts.");
          playNotificationChime();
        } else {
          setPushStatus(res.permission);
          toast.error(res.message || "Could not enable push");
        }
      } catch (err) {
        toast.error(err.message || "Failed to enable notifications");
      } finally {
        setSubscribingPush(false);
      }
    }
  };

  // Format relative time
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  };

  // Render Category Icon
  const renderCategoryIcon = (type) => {
    switch (type) {
      case "ORDER":
        return (
          <div className="inbox-type-icon order">
            <MdShoppingBag />
          </div>
        );
      case "RETURN":
        return (
          <div className="inbox-type-icon return">
            <MdAssignmentReturn />
          </div>
        );
      case "EXCHANGE":
        return (
          <div className="inbox-type-icon exchange">
            <MdSwapHoriz />
          </div>
        );
      case "LOW_STOCK":
        return (
          <div className="inbox-type-icon low-stock">
            <MdInventory />
          </div>
        );
      case "REFUND":
        return (
          <div className="inbox-type-icon refund">
            <MdAssignmentReturn />
          </div>
        );
      default:
        return (
          <div className="inbox-type-icon default">
            <MdNotificationsActive />
          </div>
        );
    }
  };

  // Action button label
  const getActionLabel = (type) => {
    switch (type) {
      case "ORDER":
        return "View Order";
      case "RETURN":
        return "Review Return";
      case "EXCHANGE":
        return "Review Exchange";
      case "LOW_STOCK":
        return "Manage Stock";
      case "REFUND":
        return "Inspect Refund";
      default:
        return "Open Details";
    }
  };

  return (
    <div className="notification-inbox-page">
      {/* 1. PAGE HEADER */}
      <div className="inbox-header">
        <div className="inbox-header-left">
          <h1>
            <MdNotificationsActive className="inbox-header-icon" />
            Notification Inbox
          </h1>
          <p>
            Real-time management for order updates, return & exchange requests,
            refunds, and low-inventory alerts.
          </p>
        </div>

        <div className="inbox-header-actions">
          {/* Quick Push Toggle */}
          {isPushSupported() && (
            <button
              type="button"
              className={`inbox-action-btn ${pushStatus === "granted" ? "" : "primary"}`}
              onClick={handleTogglePush}
              disabled={subscribingPush}
              title="Toggle Desktop OS Popups"
            >
              <MdFlashOn />
              {subscribingPush
                ? "Updating..."
                : pushStatus === "granted"
                ? "Desktop Alerts Active ✓"
                : "Enable Desktop Alerts"}
            </button>
          )}

          <button
            type="button"
            className="inbox-action-btn"
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh inbox"
          >
            <MdRefresh className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="inbox-action-btn primary"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              <MdDoneAll />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            className="inbox-action-btn danger"
            onClick={handleClearRead}
            title="Delete all read notifications"
          >
            <MdDeleteSweep />
            <span>Clear Read</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS BAR */}
      <div className="inbox-stats-grid">
        <div
          className={`inbox-stat-card ${activeTab === "ALL" ? "active" : ""}`}
          onClick={() => handleTabChange("ALL")}
        >
          <div className="stat-icon-wrap total">
            <MdNotificationsNone />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Notifications</span>
          </div>
        </div>

        <div
          className={`inbox-stat-card ${activeTab === "UNREAD" ? "active" : ""}`}
          onClick={() => handleTabChange("UNREAD")}
        >
          <div className="stat-icon-wrap unread">
            <MdNotificationsActive />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.unread}</span>
            <span className="stat-label">Unread Alerts</span>
          </div>
        </div>

        <div
          className={`inbox-stat-card ${activeTab === "ORDER" ? "active" : ""}`}
          onClick={() => handleTabChange("ORDER")}
        >
          <div className="stat-icon-wrap orders">
            <MdShoppingBag />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.orders}</span>
            <span className="stat-label">Order Notifications</span>
          </div>
        </div>

        <div
          className={`inbox-stat-card ${activeTab === "RETURN" ? "active" : ""}`}
          onClick={() => handleTabChange("RETURN")}
        >
          <div className="stat-icon-wrap returns">
            <MdAssignmentReturn />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.returns}</span>
            <span className="stat-label">Returns & Exchanges</span>
          </div>
        </div>

        <div
          className={`inbox-stat-card ${activeTab === "LOW_STOCK" ? "active" : ""}`}
          onClick={() => handleTabChange("LOW_STOCK")}
        >
          <div className="stat-icon-wrap lowstock">
            <MdInventory />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.lowStock}</span>
            <span className="stat-label">Low Stock Alerts</span>
          </div>
        </div>
      </div>

      {/* 3. QUICK TEST ACTIONS BAR */}
      <div className="inbox-test-bar">
        <div className="inbox-test-bar-left">
          <MdFlashOn className="test-flash-icon" />
          <strong>One-Click Popup Tester:</strong>
          <span>Verify instant audio, OS desktop popups & in-app alerts:</span>
        </div>
        <div className="inbox-test-buttons">
          <button
            type="button"
            className="quick-test-btn order"
            disabled={sendingTest}
            onClick={() => handleSendTestNotification("ORDER")}
          >
            + Test Order Alert
          </button>
          <button
            type="button"
            className="quick-test-btn return"
            disabled={sendingTest}
            onClick={() => handleSendTestNotification("RETURN")}
          >
            + Test Return
          </button>
          <button
            type="button"
            className="quick-test-btn exchange"
            disabled={sendingTest}
            onClick={() => handleSendTestNotification("EXCHANGE")}
          >
            + Test Exchange
          </button>
          <button
            type="button"
            className="quick-test-btn lowstock"
            disabled={sendingTest}
            onClick={() => handleSendTestNotification("LOW_STOCK")}
          >
            + Test Low Stock
          </button>
          <button
            type="button"
            className="quick-test-btn refund"
            disabled={sendingTest}
            onClick={() => handleSendTestNotification("REFUND")}
          >
            + Test Refund
          </button>
        </div>
      </div>

      {/* 4. TOOLBAR & FILTER TABS */}
      <div className="inbox-toolbar">
        <div className="inbox-toolbar-top">
          <div className="inbox-search-box">
            <MdSearch />
            <input
              type="text"
              placeholder="Search notifications by title, order #, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <MdClose />
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="inbox-tabs">
          <button
            type="button"
            className={`inbox-tab ${activeTab === "ALL" ? "active" : ""}`}
            onClick={() => handleTabChange("ALL")}
          >
            <span>All Alerts</span>
            <span className="tab-badge">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "UNREAD" ? "active" : ""}`}
            onClick={() => handleTabChange("UNREAD")}
          >
            <span>Unread</span>
            {stats.unread > 0 && <span className="tab-badge">{stats.unread}</span>}
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "ORDER" ? "active" : ""}`}
            onClick={() => handleTabChange("ORDER")}
          >
            <span>Orders</span>
            <span className="tab-badge">{stats.orders}</span>
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "RETURN" ? "active" : ""}`}
            onClick={() => handleTabChange("RETURN")}
          >
            <span>Returns</span>
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "EXCHANGE" ? "active" : ""}`}
            onClick={() => handleTabChange("EXCHANGE")}
          >
            <span>Exchanges</span>
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "LOW_STOCK" ? "active" : ""}`}
            onClick={() => handleTabChange("LOW_STOCK")}
          >
            <span>Low Stock</span>
            <span className="tab-badge">{stats.lowStock}</span>
          </button>

          <button
            type="button"
            className={`inbox-tab ${activeTab === "REFUND" ? "active" : ""}`}
            onClick={() => handleTabChange("REFUND")}
          >
            <span>Refunds</span>
          </button>
        </div>
      </div>

      {/* 5. NOTIFICATIONS LIST CONTAINER */}
      <div className="inbox-list-card">
        <div className="inbox-list-header">
          <span>
            Showing {notifications.length} of {totalCount} notifications
          </span>
          {activeTab !== "ALL" && <span>Filtered by: {activeTab}</span>}
        </div>

        {loading ? (
          <div className="inbox-loading-container">
            <MdRefresh className="spin" style={{ fontSize: 32 }} />
            <span>Loading notification inbox...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="inbox-empty-card">
            <MdNotificationsNone className="empty-inbox-svg" />
            <h3>No notifications found</h3>
            <p>
              {searchQuery
                ? `No notifications matched "${searchQuery}". Try a different keyword.`
                : "Your notification inbox is currently empty. New order, return, and stock alerts will appear here in real-time."}
            </p>
          </div>
        ) : (
          <div className="inbox-list-items">
            {notifications.map((notif) => {
              const typeClass = (notif.type || "default")
                .toLowerCase()
                .replace(/_/g, "-");

              return (
                <div
                  key={notif._id}
                  className={`inbox-item-row ${
                    notif.read ? "read" : "unread"
                  } ${notif.justArrived ? "just-arrived" : ""}`}
                  onClick={() => handleActionClick(notif)}
                >
                  {/* Category Icon */}
                  <div className="inbox-item-icon-col">
                    {renderCategoryIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="inbox-item-content">
                    <div className="inbox-item-meta-top">
                      <div className="inbox-item-title-group">
                        <strong className="inbox-item-title">{notif.title}</strong>
                        <span className={`inbox-item-badge ${typeClass}`}>
                          {notif.type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="inbox-item-time" title={new Date(notif.createdAt).toLocaleString()}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="inbox-item-message">{notif.message || notif.body}</p>

                    <div className="inbox-item-footer">
                      <div className="inbox-item-tags">
                        {notif.order && (
                          <span
                            className="order-link-chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/orders`);
                            }}
                            title="Go to Orders"
                          >
                            <MdShoppingBag />
                            Order #
                            {typeof notif.order === "object"
                              ? notif.order._id?.toString().slice(-8).toUpperCase()
                              : notif.order.toString().slice(-8).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="inbox-item-actions">
                        <button
                          type="button"
                          className="row-action-btn primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notif);
                          }}
                          title={getActionLabel(notif.type)}
                        >
                          <MdOpenInNew />
                          <span>{getActionLabel(notif.type)}</span>
                        </button>

                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={(e) => handleToggleRead(notif, e)}
                          title={notif.read ? "Mark as unread" : "Mark as read"}
                        >
                          {notif.read ? (
                            <>
                              <MdRadioButtonUnchecked />
                              <span>Mark unread</span>
                            </>
                          ) : (
                            <>
                              <MdCheckCircle style={{ color: "#0284c7" }} />
                              <span>Mark read</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="row-action-btn delete"
                          onClick={(e) => handleDeleteNotification(notif._id, e)}
                          title="Delete notification"
                        >
                          <MdDeleteOutline style={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. PAGINATION */}
        {totalPages > 1 && (
          <div className="inbox-pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                <MdArrowBack /> Previous
              </button>
              <button
                type="button"
                className="page-nav-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next <MdArrowForward />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationInbox;
