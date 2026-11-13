import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiBox,
  FiMapPin,
  FiCreditCard,
  FiAward,
  FiPower,
  FiChevronRight,
  FiHeadphones,
  FiShoppingBag,
  FiHeart,
  FiActivity,
  FiCheck,
} from "react-icons/fi";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../components/pageSections/Footer/Footer";
import "../styles/AccountOverview.css";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatCardNumber = (num) => {
  if (!num) return "2 094724 479967";
  const clean = num.toString().replace(/\s+/g, "");
  if (clean.length === 13) {
    return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  }
  return clean.replace(/(\d{4})/g, "$1 ").trim();
};

const AccountOverview = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const syncUser = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("authChanged", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("authChanged", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChanged"));
    toast.success("Logged out successfully");
    navigate("/");
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Sportsperson";
  const displayEmail = user?.email || user?.mobile || user?.phone || "Decathlon Member";
  const points = user?.points || 0;
  const userInitial = (displayName || "D").charAt(0).toUpperCase();

  const primaryQuickLinks = [
    {
      title: "My Profile",
      description: "Personal details, sports profile, size guide & preferences",
      icon: <FiUser />,
      colorClass: "theme-blue",
      badge: "Manage",
      onClick: () => navigate("/profile"),
    },
    {
      title: "My Orders & Returns",
      description: "Track active shipments, order history & exchange items",
      icon: <FiBox />,
      colorClass: "theme-indigo",
      badge: "Track",
      onClick: () => navigate("/account/orders-returns?tab=order-returns"),
    },
    {
      title: "Saved Addresses",
      description: "Default delivery addresses, pincodes & contact details",
      icon: <FiMapPin />,
      colorClass: "theme-emerald",
      badge: "Manage",
      onClick: () => navigate("/account?tab=address"),
    },
    {
      title: "My Wishlist",
      description: "Saved sporting gear, price alerts & favorite picks",
      icon: <FiHeart />,
      colorClass: "theme-rose",
      badge: "Saved",
      onClick: () => navigate("/wishlist"),
    },
    {
      title: "Decathlon Club & Rewards",
      description: "Earn points on purchases & sports, redeem discount vouchers",
      icon: <FiAward />,
      colorClass: "theme-amber",
      badge: "Rewards",
      onClick: () => navigate("/profile?tab=decathlon-card"),
    },
    {
      title: "Wallet & Gift Cards",
      description: "Decathlon cash balance, instant refunds & gift vouchers",
      icon: <FiCreditCard />,
      colorClass: "theme-cyan",
      badge: "₹0",
      onClick: () => toast("Decathlon Wallet & Gift cards are coming soon!", { icon: "🎁" }),
    },
  ];

  const secondaryQuickLinks = [
    {
      title: "24/7 Help & Support",
      description: "Order assistance, returns policy, delivery queries & FAQs",
      icon: <FiHeadphones />,
      colorClass: "theme-sky",
      badge: "Support",
      onClick: () => navigate("/support"),
    },
    {
      title: "Store Locator",
      description: "Find nearby Decathlon stores, workshop timings & test zones",
      icon: <FiShoppingBag />,
      colorClass: "theme-violet",
      badge: "Find",
      onClick: () => navigate("/stores"),
    },
    {
      title: "Sports Trackers & Activities",
      description: "Connect Strava, Garmin & Apple Health with your Decathlon account",
      icon: <FiActivity />,
      colorClass: "theme-green",
      badge: "Sync",
      onClick: () => navigate("/profile?tab=connected-apps"),
    },
  ];

  return (
    <div className="account-overview-page">
      <Navbar />
      <CategoryNav />

      <main className="account-overview-main">
        <div className="account-overview-container">
          {/* LEFT SIDEBAR */}
          <aside className="account-overview-sidebar">
            <div className="account-sidebar-card">
              {/* User Hero Banner */}
              <div className="account-loyalty-banner">
                <div className="account-user-profile-row">
                  <div className="account-avatar-circle">{userInitial}</div>
                  <div className="account-user-meta">
                    <span className="account-welcome-tag">Decathlon Member</span>
                    <h3 className="account-user-name" title={displayName}>
                      {displayName}
                    </h3>
                    <p className="account-user-identifier" title={displayEmail}>
                      {displayEmail}
                    </p>
                  </div>
                </div>

                {/* Loyalty Points Pill */}
                <div
                  className="account-points-pill"
                  onClick={() => navigate("/profile?tab=decathlon-card")}
                  title="View Decathlon Club Rewards"
                >
                  <div className="points-pill-left">
                    <FiAward className="points-pill-icon" />
                    <div>
                      <span className="points-pill-label">Loyalty Points</span>
                      <strong className="points-pill-value">{points} Pts</strong>
                    </div>
                  </div>
                  <span className="points-pill-btn">Redeem</span>
                </div>

                <div className="loyalty-progress-mini">
                  <div
                    className="loyalty-progress-mini-bar"
                    style={{ width: `${Math.min(100, Math.max(12, (points / 200) * 100))}%` }}
                  />
                </div>
                <span className="loyalty-progress-mini-text">
                  Earn {Math.max(0, 200 - points)} more pts to unlock ₹100 voucher
                </span>
              </div>

              {/* Navigation Links */}
              <nav className="account-sidebar-nav" aria-label="Account navigation">
                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/profile")}
                >
                  <div className="sidebar-item-icon-box box-blue">
                    <FiUser />
                  </div>
                  <span>My Profile</span>
                  <FiChevronRight className="sidebar-chevron" />
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/account/orders-returns?tab=order-returns")}
                >
                  <div className="sidebar-item-icon-box box-indigo">
                    <FiBox />
                  </div>
                  <span>My Orders &amp; Returns</span>
                  <FiChevronRight className="sidebar-chevron" />
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/wishlist")}
                >
                  <div className="sidebar-item-icon-box box-rose">
                    <FiHeart />
                  </div>
                  <span>My Wishlist</span>
                  <FiChevronRight className="sidebar-chevron" />
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/account?tab=address")}
                >
                  <div className="sidebar-item-icon-box box-emerald">
                    <FiMapPin />
                  </div>
                  <span>Saved Addresses</span>
                  <FiChevronRight className="sidebar-chevron" />
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => toast("Wallet features coming soon", { icon: "💳" })}
                >
                  <div className="sidebar-item-icon-box box-cyan">
                    <FiCreditCard />
                  </div>
                  <span>Wallet</span>
                  <strong className="account-sidebar-value">₹0</strong>
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/profile?tab=decathlon-card")}
                >
                  <div className="sidebar-item-icon-box box-amber">
                    <FiAward />
                  </div>
                  <span>Sporty Rewards</span>
                  <strong className="account-sidebar-value">{points} pts</strong>
                </button>

                <div className="account-sidebar-divider" />

                {/* Member Card Box */}
                <div
                  className="account-member-card-pill"
                  onClick={() => navigate("/profile?tab=decathlon-card")}
                  title="View Decathlon Membership Card"
                >
                  <FiCreditCard className="member-card-icon" />
                  <div className="member-card-text">
                    <span className="member-card-label">Digital Member Card</span>
                    <strong className="member-card-number">
                      {formatCardNumber(user?.cardNumber)}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="account-sidebar-item account-sidebar-logout"
                  onClick={handleLogout}
                >
                  <div className="sidebar-item-icon-box box-red">
                    <FiPower />
                  </div>
                  <span>Log out</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <section className="account-overview-content">
            {/* WELCOME HERO CARD */}
            <div className="account-hero-card">
              <div className="account-hero-top">
                <div className="account-hero-avatar">
                  <span>{userInitial}</span>
                  <span className="hero-online-dot" title="Active Account" />
                </div>
                <div className="account-hero-intro">
                  <div className="hero-badge-row">
                    <span className="hero-club-badge">Decathlon Club Member</span>
                    <span className="hero-verified-badge">
                      <FiCheck /> Verified Athlete
                    </span>
                  </div>
                  <h1 className="account-hero-title">Welcome, {displayName}!</h1>
                  <p className="account-hero-desc">
                    Manage your orders, returns, sports preferences, and loyalty benefits all in one place.
                  </p>
                </div>
              </div>

              {/* HERO QUICK STATS */}
              <div className="account-hero-stats">
                <div
                  className="hero-stat-item"
                  onClick={() => navigate("/account/orders-returns?tab=order-returns")}
                >
                  <div className="hero-stat-icon-wrap stat-box-orders">
                    <FiBox />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-label">Orders &amp; Returns</span>
                    <strong className="hero-stat-val">Track Orders</strong>
                  </div>
                  <FiChevronRight className="hero-stat-chevron" />
                </div>

                <div
                  className="hero-stat-item"
                  onClick={() => navigate("/profile?tab=decathlon-card")}
                >
                  <div className="hero-stat-icon-wrap stat-box-pts">
                    <FiAward />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-label">Loyalty Points</span>
                    <strong className="hero-stat-val">{points} Points</strong>
                  </div>
                  <FiChevronRight className="hero-stat-chevron" />
                </div>

                <div
                  className="hero-stat-item"
                  onClick={() => navigate("/wishlist")}
                >
                  <div className="hero-stat-icon-wrap stat-box-wishlist">
                    <FiHeart />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-label">Saved Gear</span>
                    <strong className="hero-stat-val">My Wishlist</strong>
                  </div>
                  <FiChevronRight className="hero-stat-chevron" />
                </div>

                <div
                  className="hero-stat-item"
                  onClick={() => navigate("/account?tab=address")}
                >
                  <div className="hero-stat-icon-wrap stat-box-addr">
                    <FiMapPin />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-label">Addresses</span>
                    <strong className="hero-stat-val">Manage</strong>
                  </div>
                  <FiChevronRight className="hero-stat-chevron" />
                </div>
              </div>
            </div>

            {/* SECTION 1: ACCOUNT & SHOPPING SERVICES */}
            <div className="account-section-block">
              <div className="account-section-header">
                <div>
                  <h2 className="account-section-title">Account &amp; Shopping</h2>
                  <p className="account-section-subtitle">
                    Manage your profile details, active orders, payments and club vouchers
                  </p>
                </div>
              </div>

              <div className="account-cards-grid">
                {primaryQuickLinks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="account-card-modern"
                    onClick={item.onClick}
                  >
                    <div className={`account-card-icon-circle ${item.colorClass}`}>
                      {item.icon}
                    </div>
                    <div className="account-card-meta">
                      <div className="account-card-title-row">
                        <h3 className="account-card-title">{item.title}</h3>
                        <span className="account-card-badge">{item.badge}</span>
                      </div>
                      <p className="account-card-desc">{item.description}</p>
                    </div>
                    <div className="account-card-arrow">
                      <FiChevronRight />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 2: ASSISTANCE & SERVICES */}
            <div className="account-section-block">
              <div className="account-section-header">
                <div>
                  <h2 className="account-section-title">Support &amp; Decathlon Services</h2>
                  <p className="account-section-subtitle">
                    Find store locations, check FAQs, connect with sports experts and sync activity trackers
                  </p>
                </div>
              </div>

              <div className="account-cards-grid">
                {secondaryQuickLinks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="account-card-modern"
                    onClick={item.onClick}
                  >
                    <div className={`account-card-icon-circle ${item.colorClass}`}>
                      {item.icon}
                    </div>
                    <div className="account-card-meta">
                      <div className="account-card-title-row">
                        <h3 className="account-card-title">{item.title}</h3>
                        <span className="account-card-badge">{item.badge}</span>
                      </div>
                      <p className="account-card-desc">{item.description}</p>
                    </div>
                    <div className="account-card-arrow">
                      <FiChevronRight />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountOverview;
