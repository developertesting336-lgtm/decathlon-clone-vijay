import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdNotifications,
  MdNotificationsNone,
  MdNotificationsActive,
  MdShoppingBag,
  MdAssignmentReturn,
  MdSwapHoriz,
  MdInventory,
  MdCheckCircle,
  MdDoneAll,
  MdRefresh,
  MdFlashOn,
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
import "../styles/AdminNotificationBell.css";

// Synthesize pleasant notification chime via Web Audio API (zero external assets needed)
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio autoplay restrictions before interaction
  }
};

const AdminNotificationBell = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const recentNotifsRef = useRef(new Map());

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState("default"); // 'default' | 'granted' | 'denied' | 'unsupported'
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Determine current push status
  useEffect(() => {
    setPushStatus(getNotificationPermission());
  }, []);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.get("/notifications?limit=30");
      setNotifications(res.data?.notifications || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (err) {
      console.error("Fetch admin notifications error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Sync with global unread count events from Notification Inbox
  useEffect(() => {
    const handleUnreadSync = (e) => {
      if (typeof e.detail === "number") {
        setUnreadCount(e.detail);
      } else {
        fetchNotifications();
      }
    };
    window.addEventListener("adminUnreadCountUpdated", handleUnreadSync);
    return () => window.removeEventListener("adminUnreadCountUpdated", handleUnreadSync);
  }, [fetchNotifications]);

  // Navigate when notification is clicked
  const handleNotificationClick = useCallback(
    (notif) => {
      if (!notif) return;
      if (!notif.read && notif._id) {
        api.patch(`/notifications/${notif._id}/read`).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
      setIsOpen(false);

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
          if (notif.url) {
            navigate(notif.url);
          } else {
            navigate("/orders");
          }
      }
    },
    [navigate]
  );

  // Notification Icon renderer
  const renderNotificationIcon = (type) => {
    switch (type) {
      case "RETURN":
        return <MdAssignmentReturn className="notif-type-icon return" />;
      case "EXCHANGE":
        return <MdSwapHoriz className="notif-type-icon exchange" />;
      case "ORDER":
        return <MdShoppingBag className="notif-type-icon order" />;
      case "LOW_STOCK":
        return <MdInventory className="notif-type-icon low-stock" />;
      case "REFUND":
        return <MdAssignmentReturn className="notif-type-icon refund" />;
      default:
        return <MdNotifications className="notif-type-icon default" />;
    }
  };

  // Socket.IO real-time notification listener
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      socket.emit("authenticate", { token });
    }

    const handleConnect = () => {
      const currentToken = localStorage.getItem("adminToken");
      if (currentToken) {
        socket.emit("authenticate", { token: currentToken });
      }
    };

    const handleNewNotification = (newNotif) => {
      if (!newNotif) return;

      // Deduplicate: prevent duplicate handling if received within 2.5 seconds
      const notifKey = newNotif._id || `${newNotif.title}_${newNotif.message || newNotif.body}`;
      const now = Date.now();
      if (recentNotifsRef.current.has(notifKey)) {
        const prev = recentNotifsRef.current.get(notifKey);
        if (now - prev < 2500) {
          return;
        }
      }
      recentNotifsRef.current.set(notifKey, now);

      // Clean up stale keys in map periodically
      if (recentNotifsRef.current.size > 50) {
        for (const [k, t] of recentNotifsRef.current.entries()) {
          if (now - t > 10000) recentNotifsRef.current.delete(k);
        }
      }

      // 1. Play audio chime
      playNotificationChime();

      // 2. Update list in state ONLY if NOT a test popup
      if (!newNotif.isTest) {
        setNotifications((prev) => {
          const exists = prev.some(
            (n) => n._id && newNotif._id && n._id.toString() === newNotif._id.toString()
          );
          if (exists) return prev;
          return [newNotif, ...prev];
        });

        setUnreadCount((prev) => prev + 1);
      }

      // 3. Prominent in-app popup toast (deduplicated by id)
      toast.custom(
        (t) => (
          <div
            className={`admin-notif-toast ${t.visible ? "enter" : "leave"}`}
            onClick={() => {
              toast.dismiss(t.id);
              handleNotificationClick(newNotif);
            }}
          >
            <div className="toast-icon">{renderNotificationIcon(newNotif.type)}</div>
            <div className="toast-content">
              <strong>{newNotif.title}</strong>
              <p>{newNotif.message || newNotif.body}</p>
            </div>
          </div>
        ),
        { id: `admin_toast_${notifKey}`, duration: 5000 }
      );

      // 4. Native OS / Browser Desktop Notification Popup
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(newNotif.title, {
                body: newNotif.message || newNotif.body,
                icon: "/favicon.ico",
                badge: "/favicon-32x32.png",
                data: {
                  url: newNotif.url || "/orders",
                  type: newNotif.type,
                  orderId: newNotif.order,
                },
                tag: newNotif._id || `admin_notif_${Date.now()}`,
                renotify: true,
              });
            });
          } else {
            new Notification(newNotif.title, {
              body: newNotif.message || newNotif.body,
              icon: "/favicon.ico",
            });
          }
        } catch (e) {
          console.warn("Native notification display warning:", e);
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("admin_notification", handleNewNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("admin_notification", handleNewNotification);
    };
  }, [handleNotificationClick]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Mark all read error:", err);
      toast.error("Failed to mark notifications as read");
    }
  };

  // Toggle Browser Push Notifications
  const handleTogglePush = async () => {
    if (pushStatus === "granted") {
      try {
        setSubscribingPush(true);
        await unsubscribeFromPushNotifications(api);
        setPushStatus("default");
        toast.success("Browser push notifications disabled");
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
          toast.success("Browser push notifications enabled! You will now receive popup alerts.");

          // Display immediate welcome confirmation popup
          playNotificationChime();
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Decathlon Admin Alerts Active 🔔", {
                body: "Web Push notifications enabled! You will receive popups for new orders, returns, and low stock.",
                icon: "/favicon.ico",
              });
            } catch (err) {}
          }
        } else {
          setPushStatus(res.permission);
          toast.error(res.message || "Could not enable push notifications");
        }
      } catch (err) {
        toast.error(err.message || "Failed to enable notifications");
      } finally {
        setSubscribingPush(false);
      }
    }
  };

  // Send a test popup notification instantly
  const handleSendTestNotification = async (type = "ORDER") => {
    try {
      setSendingTest(true);
      await api.post("/notifications/test-admin", { type });
      toast.success("Test notification emitted!");
    } catch (err) {
      console.error("Send test notification error:", err);
      toast.error(err.response?.data?.message || "Failed to trigger test notification");
    } finally {
      setSendingTest(false);
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
    return `${days}d ago`;
  };

  return (
    <div className="admin-notification-bell-container" ref={dropdownRef}>
      {/* QUICK ENABLE BUTTON IF NOT GRANTED */}
      {isPushSupported() && pushStatus !== "granted" && (
        <button
          type="button"
          className="admin-enable-popups-pill"
          onClick={handleTogglePush}
          disabled={subscribingPush}
          title="Enable desktop popup notifications"
        >
          <MdNotificationsActive />
          <span>{subscribingPush ? "Enabling..." : "Enable Popups"}</span>
        </button>
      )}

      {/* BELL TRIGGER BUTTON */}
      <button
        type="button"
        className={`admin-bell-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Admin Notifications"
        aria-label="Admin Notifications"
      >
        {unreadCount > 0 ? (
          <MdNotificationsActive className="bell-svg has-unread" />
        ) : (
          <MdNotificationsNone className="bell-svg" />
        )}
        {unreadCount > 0 && (
          <span className="admin-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div className="admin-notification-dropdown">
          <div className="notif-dropdown-header">
            <div className="header-title">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="action-icon-btn"
                onClick={fetchNotifications}
                title="Refresh notifications"
              >
                <MdRefresh className={loading ? "spin" : ""} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <MdDoneAll /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* BROWSER PUSH ENABLE BANNER (Clean flow - STEP 17) */}
          {isPushSupported() && (
            <div className={`notif-push-banner ${pushStatus === "granted" ? "granted" : ""}`}>
              <div className="push-banner-text">
                <strong>
                  {pushStatus === "granted"
                    ? "✓ Desktop Popups Active 🔔"
                    : "Enable Desktop Popups 🔔"}
                </strong>
                <span>
                  {pushStatus === "granted"
                    ? "Receiving instant OS alerts for new orders & low stock."
                    : "Get instant desktop alerts for orders, returns & low stock."}
                </span>
              </div>
              <div className="push-banner-actions">
                <button
                  type="button"
                  className="push-enable-btn"
                  onClick={handleTogglePush}
                  disabled={subscribingPush}
                >
                  {pushStatus === "granted" ? "Disable" : subscribingPush ? "..." : "Enable"}
                </button>
              </div>
            </div>
          )}

          {/* QUICK TEST POPUP TOOLBAR */}
          <div className="notif-test-toolbar">
            <span className="test-label">
              <MdFlashOn /> Test Popups:
            </span>
            <button
              type="button"
              className="test-btn"
              disabled={sendingTest}
              onClick={() => handleSendTestNotification("ORDER")}
              title="Test Order Popup"
            >
              Order
            </button>
            <button
              type="button"
              className="test-btn"
              disabled={sendingTest}
              onClick={() => handleSendTestNotification("RETURN")}
              title="Test Return Popup"
            >
              Return
            </button>
            <button
              type="button"
              className="test-btn"
              disabled={sendingTest}
              onClick={() => handleSendTestNotification("LOW_STOCK")}
              title="Test Low Stock Popup"
            >
              Low Stock
            </button>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <MdNotificationsNone className="empty-bell-icon" />
                <p>No notifications yet</p>
                <span>Orders, returns, exchanges, and low-stock alerts will appear here.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notif-item ${notif.read ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon-col">
                    {renderNotificationIcon(notif.type)}
                  </div>
                  <div className="notif-content-col">
                    <div className="notif-title-row">
                      <strong className="notif-item-title">{notif.title}</strong>
                      <span className="notif-time">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="notif-item-message">
                      {notif.message || notif.body}
                    </p>
                    <div className="notif-footer-row">
                      <span className={`notif-badge-pill ${notif.type.toLowerCase().replace(/_/g, "-")}`}>
                        {notif.type.replace(/_/g, " ")}
                      </span>
                      {!notif.read && (
                        <button
                          type="button"
                          className="mark-read-bullet"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title="Mark as read"
                        >
                          <MdCheckCircle />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DROPDOWN FOOTER: OPEN NOTIFICATION INBOX */}
          <div className="notif-dropdown-footer">
            <button
              type="button"
              className="notif-open-inbox-btn"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
            >
              <span>Open Notification Inbox</span>
              <MdArrowForward />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
