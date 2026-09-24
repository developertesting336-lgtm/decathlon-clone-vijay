import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  MdDashboard,
  MdInventory2,
  MdCategory,
  MdShoppingBag,
  MdPeople,
  MdImage,
  MdViewModule,
  MdSmartToy,
  MdLogout,
  MdMenu,
  MdKeyboardDoubleArrowLeft,
  MdAccountCircle,
  MdStorefront,
  MdSupportAgent,
  MdNotifications,
} from "react-icons/md";

import api from "../api/axios";
import socket from "../socket/socket";
import "../styles/AdminLayout.css";
import AdminNotificationBell from "./AdminNotificationBell";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 700
  );

  const navigate = useNavigate();
  const location = useLocation();

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [adminUser, setAdminUser] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("adminUser")) || {
          name: "Vijay",
          role: "admin",
          avatar: "",
        }
      );
    } catch {
      return { name: "Vijay", role: "admin", avatar: "" };
    }
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const u = JSON.parse(localStorage.getItem("adminUser"));
        if (u) setAdminUser(u);
      } catch (e) {}
    };
    window.addEventListener("adminUserUpdated", handleUserUpdate);
    return () => window.removeEventListener("adminUserUpdated", handleUserUpdate);
  }, []);

  const handleNav = (path) => {
    navigate(path);
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      setSidebarOpen(false);
    }
    toast.success("Logged out successfully");
    navigate("/");
  };


  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Fetch unread notification count and listen for updates
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) return;
        const res = await api.get("/notifications?read=false&limit=1");
        setUnreadNotifications(Number(res.data?.unreadCount || 0));
      } catch (e) {}
    };
    fetchUnread();

    const handleUnreadSync = (e) => {
      if (typeof e.detail === "number") {
        setUnreadNotifications(e.detail);
      }
    };
    window.addEventListener("adminUnreadCountUpdated", handleUnreadSync);

    const handleSocketNotif = (notif) => {
      if (notif && notif.isTest) return;
      setUnreadNotifications((prev) => prev + 1);
    };
    socket.on("admin_notification", handleSocketNotif);

    return () => {
      window.removeEventListener("adminUnreadCountUpdated", handleUnreadSync);
      socket.off("admin_notification", handleSocketNotif);
    };
  }, []);

  const isActive = (path) => location.pathname === path;
  const isNotificationsActive = location.pathname.startsWith("/notifications");
  const isProductsActive = location.pathname.startsWith("/products");
  const isCategoriesActive = location.pathname.startsWith("/categories");
  const isOrdersActive = location.pathname.startsWith("/orders");
  const isUsersActive = location.pathname.startsWith("/users");
  const isBannersActive = location.pathname.startsWith("/banners");
  const isPagesActive = location.pathname.startsWith("/pages");
  const isAiActive = location.pathname.startsWith("/ai-knowledge");
  const isTicketsActive = location.pathname.startsWith("/support-tickets");
  const isProfileActive = location.pathname.startsWith("/profile");

  return (
    <div
      className={`admin-layout ${
        sidebarOpen ? "sidebar-open" : "sidebar-closed"
      }`}
    >
      {/* MOBILE SCREEN BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="admin-sidebar">
        <div className="sidebar-header">
          {sidebarOpen ? (
            <>
              <div className="sidebar-brand" onClick={() => handleNav("/dashboard")}>
                <span className="brand-logo">DECATHLON</span>
                <span className="brand-badge">ENTERPRISE</span>
              </div>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(false)}
                title="Collapse Sidebar"
              >
                <MdKeyboardDoubleArrowLeft />
              </button>
            </>
          ) : (
            <div className="sidebar-collapsed-header">
              <button
                type="button"
                className="sidebar-brand-collapsed"
                onClick={() => handleNav("/dashboard")}
                title="Decathlon Admin Dashboard"
              >
                <span className="brand-logo-icon">D</span>
              </button>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(true)}
                title="Expand Sidebar"
              >
                <MdMenu />
              </button>
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          {/* SECTION: OVERVIEW */}
          {sidebarOpen && <span className="nav-group-title">OVERVIEW</span>}

          <button
            type="button"
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => handleNav("/dashboard")}
            title="Dashboard Overview"
          >
            <MdDashboard />
            {sidebarOpen && <span>Dashboard</span>}
          </button>

          <button
            type="button"
            className={isNotificationsActive ? "active" : ""}
            onClick={() => handleNav("/notifications")}
            title="Notification Inbox"
          >
            <div className="sidebar-icon-wrap">
              <MdNotifications />
              {unreadNotifications > 0 && <span className="sidebar-dot-badge" />}
            </div>
            {sidebarOpen && (
              <span className="sidebar-label-with-pill">
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="sidebar-unread-pill">{unreadNotifications}</span>
                )}
              </span>
            )}
          </button>

          {/* SECTION: CATALOG */}
          {sidebarOpen && <span className="nav-group-title">CATALOG</span>}

          <button
            type="button"
            className={isProductsActive ? "active" : ""}
            onClick={() => handleNav("/products")}
            title="Manage Products"
          >
            <MdInventory2 />
            {sidebarOpen && <span>Products</span>}
          </button>

          <button
            type="button"
            className={isCategoriesActive ? "active" : ""}
            onClick={() => handleNav("/categories")}
            title="Manage Categories"
          >
            <MdCategory />
            {sidebarOpen && <span>Categories</span>}
          </button>

          <button
            type="button"
            className={isPagesActive ? "active" : ""}
            onClick={() => handleNav("/pages")}
            title="Store Landing Pages"
          >
            <MdViewModule />
            {sidebarOpen && <span>Store Pages</span>}
          </button>

          {/* SECTION: COMMERCE & SALES */}
          {sidebarOpen && <span className="nav-group-title">COMMERCE</span>}

          <button
            type="button"
            className={isOrdersActive ? "active" : ""}
            onClick={() => handleNav("/orders")}
            title="Customer Orders"
          >
            <MdShoppingBag />
            {sidebarOpen && <span>Orders</span>}
          </button>

          <button
            type="button"
            className={isBannersActive ? "active" : ""}
            onClick={() => handleNav("/banners")}
            title="Hero & Category Banners"
          >
            <MdImage />
            {sidebarOpen && <span>Banners</span>}
          </button>

          {/* SECTION: INTELLIGENCE */}
          {sidebarOpen && <span className="nav-group-title">INTELLIGENCE</span>}

          <button
            type="button"
            className={isAiActive ? "active" : ""}
            onClick={() => handleNav("/ai-knowledge")}
            title="Gemini AI Shopping Knowledge"
          >
            <MdSmartToy />
            {sidebarOpen && <span>AI Knowledge</span>}
          </button>

          <button
            type="button"
            className={isTicketsActive ? "active" : ""}
            onClick={() => handleNav("/support-tickets")}
            title="Customer Support Tickets"
          >
            <MdSupportAgent />
            {sidebarOpen && <span>Support Tickets</span>}
          </button>

          {/* SECTION: SETTINGS */}
          {sidebarOpen && <span className="nav-group-title">ADMINISTRATION</span>}

          <button
            type="button"
            className={isUsersActive ? "active" : ""}
            onClick={() => handleNav("/users")}
            title="Customer Directory"
          >
            <MdPeople />
            {sidebarOpen && <span>Users</span>}
          </button>

          <button
            type="button"
            className={isProfileActive ? "active" : ""}
            onClick={() => handleNav("/profile")}
            title="Admin Profile & Security"
          >
            <MdAccountCircle />
            {sidebarOpen && <span>Admin Profile</span>}
          </button>
        </nav>

        {/* LOGOUT */}
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <MdLogout />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <div className="topbar-left"></div>

          <div className="topbar-right">

            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="topbar-storefront-btn"
              title="Open Decathlon Customer Storefront"
            >
              <MdStorefront />
              <span>Storefront</span>
            </a>

            <AdminNotificationBell />

            <div
              className="admin-user"
              onClick={() => handleNav("/profile")}
              title="Manage Admin Profile & Settings"
            >
              <div className="admin-avatar">
                {adminUser?.avatar ? (
                  <img
                    src={adminUser.avatar}
                    alt={adminUser.name || "Admin"}
                    className="topbar-avatar-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  adminUser?.name?.charAt(0)?.toUpperCase() || "V"
                )}
              </div>

              <div className="admin-user-info">
                <strong>{adminUser?.name || "Vijay"}</strong>
                <span>{adminUser?.role || "admin"} • Profile</span>
              </div>
            </div>
          </div>
        </header>

        <section className="admin-page-content">{children}</section>
      </main>
    </div>
  );
};

export default AdminLayout;
