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

  const displayIdentifier =
    user?.mobile || user?.phone || user?.email || user?.name || "Decathlon Member";

  const primaryQuickLinks = [
    {
      title: "My Profile",
      description: "Personal details, change password, sync my sport activities",
      icon: <FiUser />,
      onClick: () => navigate("/profile"),
    },
    {
      title: "My Orders",
      description: "Order history, Tracking, Returns & Exchange, Help",
      icon: <FiBox />,
      onClick: () => navigate("/account/orders-returns?tab=order-returns"),
    },
    {
      title: "Addresses",
      description: "Saved addresses, Add, Edit, Default address",
      icon: <FiMapPin />,
      onClick: () => navigate("/account?tab=address"),
    },
    {
      title: "Wallet",
      description: "Balance, transactions, add gift card to wallet",
      icon: <FiCreditCard />,
      onClick: () => toast("Wallet features coming soon"),
    },
    {
      title: "Sporty Rewards",
      description: "Loyalty points, link my activities, unlock rewards",
      icon: <FiAward />,
      onClick: () => toast("Sporty Rewards coming soon"),
    },
  ];

  const secondaryQuickLinks = [
    {
      title: "FAQ & support",
      description: "FAQs, contact support, help topics",
      icon: <FiHeadphones />,
      onClick: () => navigate("/support"),
    },
    {
      title: "Store Finder",
      description: "Nearby stores, directions, store details",
      icon: <FiShoppingBag />,
      onClick: () => navigate("/stores"),
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
              <div className="account-loyalty-banner">
                <div className="account-user-identifier">{displayIdentifier}</div>

                <button
                  type="button"
                  className="account-loyalty-row"
                  onClick={() => toast("Loyalty points program coming soon")}
                >
                  <span>Loyalty Points</span>
                  <strong>
                    0 Pts <FiChevronRight />
                  </strong>
                </button>

                <p className="account-loyalty-desc">
                  Shop more to earn &amp; redeem points for direct savings on purchases!
                </p>

                <button
                  type="button"
                  className="account-loyalty-learn"
                  onClick={() => toast("Loyalty program details coming soon")}
                >
                  Learn more <FiChevronRight />
                </button>
              </div>

              <nav className="account-sidebar-nav" aria-label="Account navigation">
                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/profile")}
                >
                  <FiUser className="account-sidebar-icon" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/account/orders-returns?tab=order-returns")}
                >
                  <FiBox className="account-sidebar-icon" />
                  <span>My Orders</span>
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => toast("Wallet features coming soon")}
                >
                  <FiCreditCard className="account-sidebar-icon" />
                  <span>Wallet</span>
                  <strong className="account-sidebar-value">₹0</strong>
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => toast("Sporty Rewards coming soon")}
                >
                  <FiAward className="account-sidebar-icon" />
                  <span>Sporty Rewards</span>
                  <strong className="account-sidebar-value">₹0</strong>
                </button>

                <button
                  type="button"
                  className="account-sidebar-item"
                  onClick={() => navigate("/account?tab=address")}
                >
                  <FiMapPin className="account-sidebar-icon" />
                  <span>Saved Address</span>
                </button>

                <div className="account-sidebar-divider" />

                <button
                  type="button"
                  className="account-sidebar-item account-sidebar-logout"
                  onClick={handleLogout}
                >
                  <FiPower className="account-sidebar-icon" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <section className="account-overview-content">
            <header className="account-overview-header">
              <h1>Your Decathlon account</h1>
              <p>
                Manage your orders, returns, and preferences, all in one place. You can
                discover and enjoy exclusive member benefits.
              </p>
            </header>

            <div className="account-quicklinks-section">
              <h2>Quick links</h2>
              <div className="account-quicklinks-grid">
                {primaryQuickLinks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="account-quicklink-card"
                    onClick={item.onClick}
                  >
                    <span className="account-quicklink-icon">{item.icon}</span>
                    <div className="account-quicklink-text">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="account-quicklinks-section">
              <h2>Quick links</h2>
              <div className="account-quicklinks-grid">
                {secondaryQuickLinks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="account-quicklink-card"
                    onClick={item.onClick}
                  >
                    <span className="account-quicklink-icon">{item.icon}</span>
                    <div className="account-quicklink-text">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
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
