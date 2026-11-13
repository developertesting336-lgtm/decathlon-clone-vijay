import React, { useState, useEffect, useCallback } from "react";
import {
  FiExternalLink,
  FiPlus,
  FiMinus,
  FiUser,
  FiLock,
  FiMessageSquare,
  FiEdit3,
  FiActivity,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiX,
  FiMenu,
  FiPackage,
  FiGift,
  FiAward,
  FiShoppingBag,
  FiTrendingUp,
  FiClock,
  FiUserCheck,
  FiBell,
  FiSliders,
  FiShield,
  FiLogOut,
  FiCreditCard,
  FiZap,
  FiCalendar,
  FiPhone,
  FiMail,
  FiEdit2,
} from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import DecathlonLogo from "../components/DecathlonLogo";
import ProfileSubSectionView from "../components/profile/ProfileSubSectionView";
import "../styles/Profile.css";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

const formatCardNumber = (cardNum) => {
  if (!cardNum) return "2 094724 479967";
  const clean = cardNum.toString().replace(/\s+/g, "");
  if (clean.length === 13) {
    return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  }
  return clean.replace(/(\d{4})/g, "$1 ").trim();
};

const BarcodeSVG = ({ value }) => {
  const cleanDigits = (value || "2094724479967").toString().replace(/\D/g, "");

  const DIGIT_BARS = [
    [3, 2, 1, 1], // 0
    [2, 2, 2, 1], // 1
    [2, 1, 2, 2], // 2
    [1, 4, 1, 1], // 3
    [1, 1, 3, 2], // 4
    [1, 2, 3, 1], // 5
    [1, 1, 1, 4], // 6
    [1, 3, 1, 2], // 7
    [1, 2, 1, 3], // 8
    [3, 1, 1, 2], // 9
  ];

  const allBars = [2, 1, 2];

  for (let i = 0; i < cleanDigits.length; i++) {
    const d = parseInt(cleanDigits[i], 10) || 0;
    allBars.push(...DIGIT_BARS[d]);
    if (i === 6) {
      allBars.push(1, 2, 1, 2, 1);
    }
  }

  allBars.push(2, 1, 2);

  let currentX = 14;
  return (
    <svg viewBox="0 0 310 65" className="barcode-svg" preserveAspectRatio="none">
      {allBars.map((width, idx) => {
        const x = currentX;
        currentX += width + 1.2;
        if (idx % 2 === 0) {
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={width * 1.3}
              height="65"
              fill="#111"
            />
          );
        }
        return null;
      })}
    </svg>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const isPersonalInfo = currentTab === "personal-information";
  const isDecathlonCard = currentTab === "decathlon-card";
  const isNotificationPrefs =
    currentTab === "notifications-preferences" ||
    currentTab === "notification-preferences" ||
    currentTab === "communication-preferences";

  const personalizationTabs = [
    { key: "favourite-store", label: "Favourite store" },
    { key: "favourite-sports", label: "Favourite sports" },
    { key: "connected-apps", label: "Connected apps" },
    { key: "size-guide", label: "Your size guide" },
  ];

  const privacyTabs = [
    { key: "product-recommendations", label: "Product recommendations" },
    { key: "loyalty-program", label: "Join our loyalty program" },
    { key: "visited-websites", label: "Visited websites & apps" },
    { key: "third-party-access", label: "Manage third-party access" },
    { key: "device-connections", label: "Manage device connections" },
    { key: "delete-account", label: "Delete my account" },
  ];

  const isPersonalizationSubTab = personalizationTabs.some((t) => t.key === currentTab);
  const isPrivacySubTab = privacyTabs.some((t) => t.key === currentTab);
  const isSubSectionTab = isPersonalizationSubTab || isPrivacySubTab;

  const [personalizationOpen, setPersonalizationOpen] = useState(isPersonalizationSubTab);
  const [privacyOpen, setPrivacyOpen] = useState(isPrivacySubTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentTab]);

  useEffect(() => {
    if (isPersonalizationSubTab) setPersonalizationOpen(true);
    if (isPrivacySubTab) setPrivacyOpen(true);
  }, [isPersonalizationSubTab, isPrivacySubTab]);

  const [user, setUser] = useState({
    name: "",
    email: "vk7184192@gmail.com",
    phone: "",
    dob: "",
    gender: "",
    cardNumber: "2 094724 479967",
    isPhoneVerified: true,
  });

  const [commPrefs, setCommPrefs] = useState({
    abandonedCartAndRecommendations: true,
    feedbackAndSurveys: false,
    expertTipsAndOffers: true,
    membershipUpdates: true,
    emailChannel: true,
    language: "English (India)",
  });

  // Communication Preferences handlers
  const updateCommPrefs = async (newPrefs) => {
    setCommPrefs(newPrefs);
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.communicationPreferences = newPrefs;
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch (e) {}
    }
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await api.put(
          "/user/profile",
          { communicationPreferences: newPrefs },
          getAuthConfig()
        );
      } catch (err) {
        console.error("Failed to save communication preferences to API:", err);
      }
    }
  };

  const togglePreference = (key) => {
    const updated = {
      ...commPrefs,
      [key]: !commPrefs[key],
    };
    updateCommPrefs(updated);
    toast.success("Preferences updated", { id: "comm-pref-toast", duration: 1500 });
  };

  const handleUnsubscribeAll = () => {
    const unsubscribed = {
      abandonedCartAndRecommendations: false,
      feedbackAndSurveys: false,
      expertTipsAndOffers: false,
      membershipUpdates: false,
      emailChannel: false,
      language: commPrefs.language || "English (India)",
    };
    updateCommPrefs(unsubscribed);
    toast.success("Unsubscribed from all communications", { id: "comm-pref-toast", duration: 2500 });
  };

  const handleLanguageChange = (newLang) => {
    const updated = {
      ...commPrefs,
      language: newLang,
    };
    updateCommPrefs(updated);
    toast.success(`Language set to ${newLang}`, { id: "comm-pref-toast", duration: 1500 });
  };

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    open: false,
    field: "",
    title: "",
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    phone: "",
    email: "",
  });
  const [savingField, setSavingField] = useState(false);

  // Load User Data
  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        setUser((prev) => ({
          ...prev,
          ...parsed,
          cardNumber: parsed.cardNumber || prev.cardNumber || "2 094724 479967",
        }));
        if (parsed.communicationPreferences) {
          setCommPrefs((prev) => ({
            ...prev,
            ...parsed.communicationPreferences,
          }));
        }
      } catch (e) {
        console.error("Parse user error:", e);
      }
    }

    if (!token) return;

    try {
      const res = await api.get("/user/profile", getAuthConfig());
      if (res.data?.user) {
        const u = res.data.user;
        setUser((prev) => ({
          ...prev,
          ...u,
          cardNumber: u.cardNumber || prev.cardNumber || "2 094724 479967",
        }));
        if (u.communicationPreferences) {
          setCommPrefs((prev) => ({
            ...prev,
            ...u.communicationPreferences,
          }));
        }
        localStorage.setItem("user", JSON.stringify({ ...u }));
      }
    } catch (err) {
      console.log("Could not fetch user profile from API, using cached data:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChanged"));
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const openEditModal = (field) => {
    let title = "Edit Information";
    let firstName = "";
    let lastName = "";

    if (field === "name") {
      title = "Edit First Name and Last Name";
      const parts = (user.name || "").trim().split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    } else if (field === "dob") {
      title = "Edit Date of Birth";
    } else if (field === "gender") {
      title = "Edit Gender";
    } else if (field === "phone") {
      title = "Edit Phone Number";
    } else if (field === "email") {
      title = "Edit Email Address";
    }

    setEditModal({
      open: true,
      field,
      title,
      firstName,
      lastName,
      dob: user.dob || "",
      gender: user.gender || "",
      phone: user.phone || "",
      email: user.email || "",
    });
  };

  const closeEditModal = () => {
    if (savingField) return;
    setEditModal({
      open: false,
      field: "",
      title: "",
      firstName: "",
      lastName: "",
      dob: "",
      gender: "",
      phone: "",
      email: "",
    });
  };

  const handleSaveField = async (e) => {
    e.preventDefault();
    setSavingField(true);

    const payload = {};
    if (editModal.field === "name") {
      const combined = `${editModal.firstName.trim()} ${editModal.lastName.trim()}`.trim();
      payload.name = combined;
    } else if (editModal.field === "dob") {
      payload.dob = editModal.dob;
    } else if (editModal.field === "gender") {
      payload.gender = editModal.gender;
    } else if (editModal.field === "phone") {
      payload.phone = editModal.phone.trim();
    } else if (editModal.field === "email") {
      payload.email = editModal.email.trim();
    }

    try {
      const res = await api.put("/user/profile", payload, getAuthConfig());
      const updated = res.data?.user || { ...user, ...payload };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChanged"));
      toast.success(res.data?.message || "Personal information updated successfully");
      closeEditModal();
    } catch (err) {
      console.error("Save profile error:", err);
      // Fallback local update if offline
      const updated = { ...user, ...payload };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success("Personal information updated successfully");
      closeEditModal();
    } finally {
      setSavingField(false);
    }
  };

  return (
    <div className="profile-page">
      {/* ==================================================
          HEADER
      ================================================== */}
      <header className="profile-header">
        <div className="profile-header-left">
          <button
            type="button"
            className="profile-mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <FiMenu />
          </button>
          <Link to="/" className="decathlon-logo" style={{ textDecoration: "none" }} title="Decathlon Store Home">
            <DecathlonLogo height={24} />
          </Link>
          <span className="profile-header-divider" />
          <span className="profile-header-portal-tag">My Account</span>
        </div>

        <div className="profile-header-right">
          <Link to="/" className="profile-header-action" title="Continue Shopping">
            <FiShoppingBag className="header-action-icon" />
            <span className="header-action-text">Continue Shopping</span>
          </Link>

          <Link
            to="/account/orders-returns?tab=order-returns"
            className="profile-header-action"
            title="Track Orders & Returns"
          >
            <FiPackage className="header-action-icon" />
            <span className="header-action-text">My Orders</span>
          </Link>

          <Link to="/cart" className="profile-header-action header-cart-pill" title="View Cart">
            <FiShoppingBag className="header-action-icon" />
            <span className="header-action-text">Cart</span>
          </Link>

          <div
            className="profile-header-user-pill"
            onClick={() => setSearchParams({ tab: "personal-information" })}
            title="Manage Personal Information"
          >
            <div className="header-avatar-circle">
              <FiUser />
            </div>
            <span className="header-user-display">
              {user.name ? user.name.split(" ")[0] : (user.email ? user.email.split("@")[0] : "Member")}
            </span>
          </div>
        </div>
      </header>

      {/* ==================================================
          PAGE LAYOUT
      ================================================== */}
      <div className="profile-layout">
        {mobileSidebarOpen && (
          <div
            className="profile-sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ==================================================
            SIDEBAR
        ================================================== */}
        <aside className={`profile-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <button
            type="button"
            className="profile-sidebar-close"
            aria-label="Close menu"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <FiX />
          </button>
          {/* USER BOX */}
          <div className="profile-user-box">
            <div className="profile-user-top">
              <div className="profile-user-avatar">
                <FiUser />
              </div>
              <div className="profile-user-details">
                <span className="profile-user-greeting">Welcome</span>
                <p className="profile-email" title={user.email || ""}>
                  {user.email || "user@example.com"}
                </p>
              </div>
            </div>

            <div className="profile-points-pill">
              <div className="profile-points-info">
                <FiAward className="profile-points-icon" />
                <span className="profile-points-value">{user.points || 0}</span>
                <span className="profile-points-label">Points</span>
              </div>
              <button
                type="button"
                className="redeem-btn"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                Redeem
              </button>
            </div>
          </div>

          {/* SIDEBAR MENU */}
          <div className="profile-menu">
            {/* PURCHASES */}
            <div className="menu-section">
              <div className="menu-section-header">Purchases</div>
              <Link
                to="/account/orders-returns?tab=order-returns"
                className="menu-item menu-link-external"
              >
                <div className="menu-item-left">
                  <FiPackage className="menu-icon" />
                  <span>Orders &amp; Returns</span>
                </div>
                <FiExternalLink className="menu-external-icon" />
              </Link>
              <div
                className="menu-item"
                onClick={() => toast("Gift cards coming soon!", { icon: "🎁" })}
              >
                <div className="menu-item-left">
                  <FiGift className="menu-icon" />
                  <span>Gift Cards</span>
                </div>
                <FiExternalLink className="menu-external-icon" />
              </div>
            </div>

            {/* LOYALTY */}
            <div className="menu-section">
              <div className="menu-section-header">Loyalty &amp; Club</div>
              <div
                className={`menu-link ${isDecathlonCard ? "active-link" : ""}`}
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiCreditCard className="menu-icon" />
                  <span>Loyalty Card</span>
                </div>
              </div>
              <div
                className="menu-link"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiShoppingBag className="menu-icon" />
                  <span>Rewards Shop</span>
                </div>
              </div>
              <div
                className="menu-link"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiAward className="menu-icon" />
                  <span>Unlocked Rewards</span>
                </div>
              </div>
              <div
                className="menu-link"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiTrendingUp className="menu-icon" />
                  <span>Earn More Points</span>
                </div>
              </div>
              <div
                className="menu-link"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiActivity className="menu-icon" />
                  <span>Sport Sessions</span>
                </div>
              </div>
              <div
                className="menu-link"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                <div className="menu-item-left">
                  <FiClock className="menu-icon" />
                  <span>Points History</span>
                </div>
              </div>
            </div>

            {/* PROFILE & SETTINGS */}
            <div className="menu-section profile-menu-section">
              <div className="menu-section-header">Account Settings</div>
              <div
                className={`menu-link ${!currentTab ? "active-link" : ""}`}
                onClick={() => setSearchParams({})}
              >
                <div className="menu-item-left">
                  <FiUser className="menu-icon" />
                  <span>Profile Overview</span>
                </div>
              </div>
              <div
                className={`menu-link ${isPersonalInfo ? "active-link" : ""}`}
                onClick={() => setSearchParams({ tab: "personal-information" })}
              >
                <div className="menu-item-left">
                  <FiUserCheck className="menu-icon" />
                  <span>Personal Information</span>
                </div>
              </div>
              <div
                className={`menu-link ${isNotificationPrefs ? "active-link" : ""}`}
                onClick={() => setSearchParams({ tab: "notifications-preferences" })}
              >
                <div className="menu-item-left">
                  <FiBell className="menu-icon" />
                  <span>Notification Preferences</span>
                </div>
              </div>

              {/* Personalization Dropdown */}
              <div
                className={`menu-link menu-with-icon ${personalizationOpen || isPersonalizationSubTab ? "active-menu" : ""}`}
                onClick={() => setPersonalizationOpen((prev) => !prev)}
              >
                <div className="menu-item-left">
                  <FiSliders className="menu-icon" />
                  <span>Personalization</span>
                </div>
                <span className="submenu-caret">
                  {personalizationOpen ? <FiMinus /> : <FiPlus />}
                </span>
              </div>
              {personalizationOpen && (
                <div className="menu-submenu">
                  {personalizationTabs.map((item) => (
                    <div
                      key={item.key}
                      className={`menu-sublink ${currentTab === item.key ? "active-link" : ""}`}
                      onClick={() => setSearchParams({ tab: item.key })}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Privacy and security Dropdown */}
              <div
                className={`menu-link menu-with-icon ${privacyOpen || isPrivacySubTab ? "active-menu" : ""}`}
                onClick={() => setPrivacyOpen((prev) => !prev)}
              >
                <div className="menu-item-left">
                  <FiShield className="menu-icon" />
                  <span>Privacy &amp; Security</span>
                </div>
                <span className="submenu-caret">
                  {privacyOpen ? <FiMinus /> : <FiPlus />}
                </span>
              </div>
              {privacyOpen && (
                <div className="menu-submenu">
                  {privacyTabs.map((item) => (
                    <div
                      key={item.key}
                      className={`menu-sublink ${currentTab === item.key ? "active-link" : ""}`}
                      onClick={() => setSearchParams({ tab: item.key })}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD NUMBER & LOGOUT FOOTER */}
            <div className="profile-sidebar-footer">
              <div
                className="card-number-badge"
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
                title="View Decathlon Membership Card"
              >
                <FiCreditCard className="footer-card-icon" />
                <div>
                  <span className="card-number-label">Member Card</span>
                  <strong className="card-number-val">
                    {user.cardNumber?.replace(/\s+/g, "") || "2094724479967"}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="profile-logout-btn"
                onClick={handleLogout}
              >
                <FiLogOut className="logout-icon" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}
        <main className="profile-content">
          {isSubSectionTab ? (
            <ProfileSubSectionView
              activeTab={currentTab}
              userEmail={user.email}
              onBack={() => setSearchParams({})}
              onLogout={handleLogout}
            />
          ) : isNotificationPrefs ? (
            /* ==================================================
               COMMUNICATION / NOTIFICATION PREFERENCES VIEW
            ================================================== */
            <div className="communication-prefs-container">
              {/* BACK TO PERSONAL INFORMATION BREADCRUMB */}
              <button
                type="button"
                className="back-to-profile-btn"
                onClick={() => setSearchParams({ tab: "personal-information" })}
              >
                <FiChevronLeft /> Preferences and personalization
              </button>

              <h1 className="communication-prefs-title">Communication preferences</h1>

              {/* SECTION 1: MY COMMUNICATION PREFERENCES */}
              <h2 className="communication-section-heading">My communication preferences</h2>

              <div className="comm-card">
                <p className="comm-card-intro">
                  Have experts provide you with advice on sports you practice, participate in the improvement of our product by sharing your feedback and keep informed of the many events planned by your stores.
                </p>

                <h3 className="comm-card-subheading">Would you like to receive :</h3>

                <div className="comm-options-list">
                  <div className="comm-option-row">
                    <button
                      type="button"
                      className={`decathlon-switch ${commPrefs.abandonedCartAndRecommendations ? "is-active" : ""}`}
                      onClick={() => togglePreference("abandonedCartAndRecommendations")}
                      aria-label="Toggle reminder emails for abandoned carts and recommendations"
                    >
                      <span className="switch-thumb">
                        {commPrefs.abandonedCartAndRecommendations && <FiCheck className="switch-check-icon" />}
                      </span>
                    </button>
                    <span className="comm-option-label">
                      Get reminder emails for abandoned carts and personalised product recommendations.
                    </span>
                  </div>

                  <div className="comm-option-row">
                    <button
                      type="button"
                      className={`decathlon-switch ${commPrefs.feedbackAndSurveys ? "is-active" : ""}`}
                      onClick={() => togglePreference("feedbackAndSurveys")}
                      aria-label="Toggle feedback and surveys"
                    >
                      <span className="switch-thumb">
                        {commPrefs.feedbackAndSurveys && <FiCheck className="switch-check-icon" />}
                      </span>
                    </button>
                    <span className="comm-option-label">
                      Your feedback on our products, services, events, etc, helps us give you a better experience.
                    </span>
                  </div>

                  <div className="comm-option-row">
                    <button
                      type="button"
                      className={`decathlon-switch ${commPrefs.expertTipsAndOffers ? "is-active" : ""}`}
                      onClick={() => togglePreference("expertTipsAndOffers")}
                      aria-label="Toggle expert tips, sport events and offers"
                    >
                      <span className="switch-thumb">
                        {commPrefs.expertTipsAndOffers && <FiCheck className="switch-check-icon" />}
                      </span>
                    </button>
                    <span className="comm-option-label">
                      Get expert tips to learn and grow, training made for your sport, events near you, and the latest gear and offers. Just tell us what you're into—we'll handle the rest!
                    </span>
                  </div>

                  <div className="comm-option-row">
                    <button
                      type="button"
                      className={`decathlon-switch ${commPrefs.membershipUpdates ? "is-active" : ""}`}
                      onClick={() => togglePreference("membershipUpdates")}
                      aria-label="Toggle membership program updates"
                    >
                      <span className="switch-thumb">
                        {commPrefs.membershipUpdates && <FiCheck className="switch-check-icon" />}
                      </span>
                    </button>
                    <span className="comm-option-label">
                      Giving consent lets us send you updates about the Membership program—and you can choose to opt out anytime.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: MY COMMUNICATION CHANNELS */}
              <h2 className="communication-section-heading" style={{ marginTop: "36px" }}>
                My communication channels
              </h2>

              <div className="comm-card">
                <p className="comm-card-intro">
                  Tell us how you prefer to receive communication from Decathlon (each communication channel is activated by default).
                </p>

                <h3 className="comm-card-subheading">Would you like to receive our communications by :</h3>

                <div className="comm-options-list">
                  <div className="comm-option-row">
                    <button
                      type="button"
                      className={`decathlon-switch ${commPrefs.emailChannel ? "is-active" : ""}`}
                      onClick={() => togglePreference("emailChannel")}
                      aria-label="Toggle email channel"
                    >
                      <span className="switch-thumb">
                        {commPrefs.emailChannel && <FiCheck className="switch-check-icon" />}
                      </span>
                    </button>
                    <span className="comm-option-label comm-channel-name">
                      Email
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION CARD: UNSUBSCRIBE FROM ALL */}
              <div
                className="comm-action-card"
                onClick={handleUnsubscribeAll}
                role="button"
                tabIndex={0}
              >
                <span className="comm-action-title">Unsubscribe from all communications</span>
                <FiChevronRight className="comm-action-chevron" />
              </div>

              {/* SECTION 3: YOUR COMMUNICATION LANGUAGE */}
              <h2 className="communication-section-heading" style={{ marginTop: "36px" }}>
                Your communication language
              </h2>

              <div className="comm-card">
                <p className="comm-card-intro">
                  Choose the language in which you wish to receive communications from Decathlon.
                </p>

                <div className="comm-language-selector-wrap">
                  <select
                    className="comm-language-select"
                    value={commPrefs.language || "English (India)"}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <option value="English (India)">English (India)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="French">Français (French)</option>
                    <option value="Spanish">Español (Spanish)</option>
                  </select>
                </div>
              </div>

              {/* FOOTER */}
              <footer className="profile-footer" style={{ marginTop: "48px" }}>
                <p>
                  Website protected by reCAPTCHA: the <span>privacy policy</span>{" "}
                  and the <span>terms of use</span> of Google apply.
                </p>
                <div className="footer-links">
                  <span>Cookie Management</span>
                  <span>Accessibility: partially compliant</span>
                </div>
              </footer>
            </div>
          ) : isDecathlonCard ? (
            /* ==================================================
               MY DECATHLON CARD VIEW (MATCHING DECATHLON OFFICIAL)
            ================================================== */
            <div className="decathlon-card-view-container">
              {/* BACK TO PERSONAL INFORMATION BREADCRUMB */}
              <button
                type="button"
                className="back-to-profile-btn"
                onClick={() => setSearchParams({ tab: "personal-information" })}
              >
                <FiChevronLeft /> Personal information
              </button>

              <h1 className="personal-info-title">My Decathlon card</h1>
              <p className="decathlon-card-desc">
                Your card number is an information specific to your account.
                It can be used to authenticate in store and used in your
                communications with the customer service.
              </p>

              {/* DIGITAL CARD */}
              <div className="decathlon-digital-card">
                <div className="digital-card-logo">
                  <DecathlonLogo height={26} />
                </div>

                <div className="digital-card-barcode-box">
                  <BarcodeSVG value={user.cardNumber} />
                  <div className="barcode-number">
                    {formatCardNumber(user.cardNumber)}
                  </div>
                </div>
              </div>

              {/* CARD BENEFITS SECTION */}
              <div className="card-benefits-section">
                <div className="benefits-left">
                  <h2>My card benefits</h2>
                  <p>
                    Decathlon can reward you for each purchase, sports session
                    registered, eco-friendly gestures and reviews posted on a
                    product. Earn points and transform them into rewards
                    thanks to our loyalty program.
                  </p>
                </div>

                <div className="benefits-loyalty-box">
                  <span className="loyalty-badge-new">New</span>
                  <div className="loyalty-box-header">
                    <h3 className="loyalty-box-title">Loyalty program</h3>
                  </div>
                  <p className="loyalty-box-desc">
                    Earn enough points and enjoy discounts on your next purchases!
                  </p>
                  <button
                    type="button"
                    className="btn-manage-loyalty"
                    onClick={() => navigate("/account")}
                  >
                    <span>Manage my loyalty program</span>
                    <FiExternalLink />
                  </button>
                </div>
              </div>

              {/* FOOTER */}
              <footer className="profile-footer" style={{ marginTop: "48px" }}>
                <p>
                  Website protected by reCAPTCHA: the <span>privacy policy</span>{" "}
                  and the <span>terms of use</span> of Google apply.
                </p>
                <div className="footer-links">
                  <span>Cookie Management</span>
                  <span>Accessibility: partially compliant</span>
                </div>
              </footer>
            </div>
          ) : isPersonalInfo ? (
            /* ==================================================
               PERSONAL INFORMATION VIEW (MODERN DECATHLON ATHLETE IDENTITY)
            ================================================== */
            <div className="personal-info-container">
              {/* BACK NAVIGATION */}
              <div className="pi-top-nav">
                <button
                  type="button"
                  className="pi-back-btn"
                  onClick={() => setSearchParams({})}
                >
                  <FiChevronLeft />
                  <span>Profile Overview</span>
                </button>
                <div className="pi-breadcrumb-trail">
                  <span>Account</span> / <span>Settings</span> / <span className="active">Personal Information</span>
                </div>
              </div>

              {/* HERO PROFILE CARD */}
              <div className="pi-hero-card">
                <div className="pi-hero-avatar-wrap">
                  <div className="pi-hero-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
                  </div>
                  <span className="pi-hero-verified-badge" title="Verified Member">
                    <FiCheck />
                  </span>
                </div>

                <div className="pi-hero-details">
                  <div className="pi-hero-name-row">
                    <h1 className="pi-hero-name">{user.name || "Decathlon Athlete"}</h1>
                    <span className="pi-status-chip">
                      <span className="pi-status-dot" /> Active Member
                    </span>
                  </div>
                  <p className="pi-hero-subtitle">
                    Manage your personal athlete profile, verified contact details, and digital sports pass.
                  </p>
                  <div className="pi-hero-meta">
                    <span className="pi-meta-item">
                      <FiMail /> {user.email || "No email linked"}
                    </span>
                    {user.phone && (
                      <span className="pi-meta-item">
                        <FiPhone /> {user.phone}
                      </span>
                    )}
                    <span className="pi-meta-item pi-meta-card">
                      <FiCreditCard /> Card: {formatCardNumber(user.cardNumber)}
                    </span>
                  </div>
                </div>
              </div>

              {/* IDENTITY & CONTACT CARD */}
              <div className="pi-card">
                <div className="pi-card-header">
                  <div>
                    <h2 className="pi-card-title">Identity & Contact Details</h2>
                    <p className="pi-card-subtitle">
                      Your personal details are securely stored and used for in-store checkout and online deliveries.
                    </p>
                  </div>
                </div>

                <div className="pi-fields-list">
                  {/* FIRST NAME AND LAST NAME */}
                  <div className="pi-field-row">
                    <div className="pi-field-icon-wrap box-blue">
                      <FiUser />
                    </div>
                    <div className="pi-field-content">
                      <span className="pi-field-label">Full Name</span>
                      <div className="pi-field-val-wrap">
                        <span className={`pi-field-value ${user.name ? "has-val" : "is-empty"}`}>
                          {user.name || "No name provided"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pi-btn-edit"
                      onClick={() => openEditModal("name")}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* DATE OF BIRTH */}
                  <div className="pi-field-row">
                    <div className="pi-field-icon-wrap box-purple">
                      <FiCalendar />
                    </div>
                    <div className="pi-field-content">
                      <span className="pi-field-label">Date of Birth</span>
                      <div className="pi-field-val-wrap">
                        <span className={`pi-field-value ${user.dob ? "has-val" : "is-empty"}`}>
                          {user.dob || "No date of birth provided"}
                        </span>
                        {!user.dob && (
                          <span className="pi-hint-chip">
                            <FiAward /> Add for birthday perks
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pi-btn-edit"
                      onClick={() => openEditModal("dob")}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* GENDER */}
                  <div className="pi-field-row">
                    <div className="pi-field-icon-wrap box-emerald">
                      <FiUserCheck />
                    </div>
                    <div className="pi-field-content">
                      <span className="pi-field-label">Gender</span>
                      <div className="pi-field-val-wrap">
                        <span className={`pi-field-value ${user.gender ? "has-val" : "is-empty"}`}>
                          {user.gender || "No information provided"}
                        </span>
                        {user.gender && (
                          <span className="pi-badge pi-badge-muted">
                            {user.gender}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pi-btn-edit"
                      onClick={() => openEditModal("gender")}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* PHONE NUMBER */}
                  <div className="pi-field-row">
                    <div className="pi-field-icon-wrap box-amber">
                      <FiPhone />
                    </div>
                    <div className="pi-field-content">
                      <span className="pi-field-label">Phone Number</span>
                      <div className="pi-field-val-wrap">
                        <span className={`pi-field-value ${user.phone ? "has-val" : "is-empty"}`}>
                          {user.phone || "No phone number linked"}
                        </span>
                        {user.phone ? (
                          <span className="pi-badge pi-badge-verified">
                            <FiCheck /> Verified
                          </span>
                        ) : (
                          <span className="pi-hint-chip">Required for SMS order updates</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pi-btn-edit"
                      onClick={() => openEditModal("phone")}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* EMAIL ADDRESS */}
                  <div className="pi-field-row">
                    <div className="pi-field-icon-wrap box-sky">
                      <FiMail />
                    </div>
                    <div className="pi-field-content">
                      <span className="pi-field-label">Email Address</span>
                      <div className="pi-field-val-wrap">
                        <span className="pi-field-value has-val">
                          {user.email || "developer@decathlon.com"}
                        </span>
                        <span className="pi-badge pi-badge-primary">
                          Primary Account
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pi-btn-edit"
                      onClick={() => openEditModal("email")}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* MY DECATHLON DIGITAL CARD SECTION */}
              <div className="pi-card-section">
                <div className="pi-section-head">
                  <h2 className="pi-card-title">My Decathlon Digital Card</h2>
                  <p className="pi-card-subtitle">
                    Your digital membership card is linked to all your in-store and online purchases, warranty guarantees, and loyalty points.
                  </p>
                </div>

                <div
                  className="pi-digital-card"
                  onClick={() => setSearchParams({ tab: "decathlon-card" })}
                  title="Click to view full Decathlon card and barcode"
                >
                  <div className="pi-dc-glow" />
                  <div className="pi-dc-top">
                    <div className="pi-dc-brand">
                      <span className="pi-dc-logo">DECATHLON</span>
                      <span className="pi-dc-pass-tag">SPORT PASS</span>
                    </div>
                    <div className="pi-dc-chip">
                      <FiCreditCard />
                    </div>
                  </div>

                  <div className="pi-dc-middle">
                    <span className="pi-dc-num-label">MEMBERSHIP NUMBER</span>
                    <span className="pi-dc-number">
                      {formatCardNumber(user.cardNumber)}
                    </span>
                  </div>

                  <div className="pi-dc-bottom">
                    <div className="pi-dc-holder">
                      <span className="pi-dc-holder-label">CARDHOLDER</span>
                      <span className="pi-dc-holder-name">
                        {user.name ? user.name.toUpperCase() : "DECATHLON ATHLETE"}
                      </span>
                    </div>
                    <div className="pi-dc-action">
                      <span>View Card & Barcode</span>
                      <div className="pi-dc-arrow">
                        <FiChevronRight />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==================================================
               SHORTCUTS OVERVIEW (MAIN PROFILE DASHBOARD)
            ================================================== */
            <>
              {/* TOP SECTION */}
              <section className="profile-top">
                {/* Modern Welcome Hero Card */}
                <div className="welcome-card-modern">
                  <div className="welcome-card-header">
                    <div className="welcome-avatar-wrap">
                      <div className="welcome-avatar-circle">
                        <FiUser />
                      </div>
                      <span className="welcome-status-dot" title="Active Account" />
                    </div>
                    <div className="welcome-heading">
                      <div className="welcome-greeting-row">
                        <span className="welcome-badge">Decathlon Member</span>
                        {user.isPhoneVerified && (
                          <span className="welcome-verified-chip">
                            <FiCheck className="chip-icon" /> Verified
                          </span>
                        )}
                      </div>
                      <h1 className="welcome-title">
                        Welcome, {user.name ? user.name.split(" ")[0] : (user.email ? user.email.split("@")[0] : "Athlete")}!
                      </h1>
                      <p className="welcome-subtitle">
                        Manage your profile, sports activities, membership rewards, and orders all in one place.
                      </p>
                    </div>
                  </div>

                  <div className="welcome-quick-stats">
                    <div
                      className="welcome-stat-item"
                      onClick={() => setSearchParams({ tab: "decathlon-card" })}
                    >
                      <div className="stat-icon-wrap stat-pts">
                        <FiAward />
                      </div>
                      <div className="stat-meta">
                        <span className="stat-label">Loyalty Points</span>
                        <span className="stat-val">{user.points || 0} pts</span>
                      </div>
                    </div>

                    <div
                      className="welcome-stat-item"
                      onClick={() => navigate("/account/orders-returns?tab=order-returns")}
                    >
                      <div className="stat-icon-wrap stat-orders">
                        <FiPackage />
                      </div>
                      <div className="stat-meta">
                        <span className="stat-label">Orders &amp; Returns</span>
                        <span className="stat-val">Track Orders</span>
                      </div>
                    </div>

                    <div
                      className="welcome-stat-item"
                      onClick={() => setSearchParams({ tab: "personal-information" })}
                    >
                      <div className="stat-icon-wrap stat-profile">
                        <FiEdit3 />
                      </div>
                      <div className="stat-meta">
                        <span className="stat-label">Profile Settings</span>
                        <span className="stat-val">Edit Details</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Loyalty Program Card */}
                <div className="loyalty-card-modern">
                  <div className="loyalty-badge-row">
                    <span className="loyalty-pill-new">CLUB REWARDS</span>
                    <span className="loyalty-tier-badge">Active Member</span>
                  </div>
                  <h2 className="loyalty-modern-title">Loyalty Program</h2>
                  <p className="loyalty-modern-desc">
                    Earn 1 point for every ₹100 spent and convert points into instant purchase vouchers!
                  </p>

                  <div className="loyalty-progress-container">
                    <div className="loyalty-progress-meta">
                      <span className="progress-label">Current Progress</span>
                      <span className="progress-value">
                        <strong>{user.points || 0}</strong> / 200 pts
                      </span>
                    </div>
                    <div className="loyalty-progress-track">
                      <div
                        className="loyalty-progress-bar"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(12, ((user.points || 0) / 200) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="progress-note">
                      Earn {Math.max(0, 200 - (user.points || 0))} more pts to unlock ₹100 discount voucher
                    </span>
                  </div>

                  <button
                    type="button"
                    className="loyalty-action-btn"
                    onClick={() => setSearchParams({ tab: "decathlon-card" })}
                  >
                    <span>Manage Loyalty Program</span>
                    <FiExternalLink />
                  </button>
                </div>
              </section>

              {/* SPORTS BANNER */}
              <section className="sports-banner-modern">
                <div className="sports-banner-left">
                  <div className="sports-phone-mockup">
                    <img
                      src="https://contents.mediadecathlon.com/s1212514/k$1defdc1cd8f187e0e3f69e07e288b033/step-1.svg"
                      alt="Synchronize sports activities"
                      className="sports-mockup-svg"
                    />
                  </div>
                </div>

                <div className="sports-banner-right">
                  <div className="sports-banner-tag">
                    <FiActivity className="tag-icon" />
                    <span>FITNESS &amp; ACTIVITY SYNC</span>
                  </div>
                  <h2 className="sports-banner-title">
                    Synchronize all your favorite sports trackers and activities!
                  </h2>
                  <p className="sports-banner-desc">
                    If you use several sports trackers to register your activities, this new feature is for you! Gather all your workout stats in one place and earn Decathlon points with every sweat session.
                  </p>

                  <div className="sports-apps-row">
                    <span className="sports-app-pill app-strava">Strava</span>
                    <span className="sports-app-pill app-garmin">Garmin</span>
                    <span className="sports-app-pill app-apple">Apple Health</span>
                    <span className="sports-app-pill app-polar">Polar</span>
                    <span className="sports-app-pill app-coros">Coros</span>
                  </div>

                  <button
                    type="button"
                    className="sports-sync-btn-modern"
                    onClick={() => setSearchParams({ tab: "connected-apps" })}
                  >
                    <FiZap className="btn-icon" />
                    <span>Synchronize Trackers</span>
                  </button>
                </div>
              </section>

              {/* SHORTCUTS */}
              <section className="shortcuts-section-modern">
                <div className="shortcuts-header-row">
                  <div>
                    <h2 className="shortcuts-title-modern">Your Shortcuts</h2>
                    <p className="shortcuts-subtitle-modern">
                      Quick access to manage your account security, personal profile and preferences
                    </p>
                  </div>
                </div>

                <div className="shortcut-grid-modern">
                  <div
                    className="shortcut-card-item"
                    onClick={() => toast("Password reset option is in Privacy & Security", { icon: "🔒" })}
                  >
                    <ShortcutCard
                      icon={<FiLock />}
                      title="Change my password"
                      description="A strong password increases the security of your account"
                    />
                  </div>

                  <div
                    className="shortcut-card-item"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSearchParams({ tab: "notifications-preferences" })
                    }
                  >
                    <ShortcutCard
                      icon={<FiMessageSquare />}
                      title="Communication preferences"
                      description="Choose your communication channels, newsletters and updates"
                    />
                  </div>

                  {/* EDIT MY PERSONAL PROFILE SHORTCUT */}
                  <div
                    className="shortcut-card-item"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSearchParams({ tab: "personal-information" })
                    }
                  >
                    <ShortcutCard
                      icon={<FiEdit3 />}
                      title="Edit my personal profile"
                      description="Keep your contact info, addresses and details up to date"
                    />
                  </div>

                  <div
                    className="shortcut-card-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSearchParams({ tab: "favourite-sports" })}
                  >
                    <ShortcutCard
                      icon={<FiActivity />}
                      title="Manage my favorite sports"
                      description="Tell us more about your sporting preferences and skill levels"
                    />
                  </div>

                  <div
                    className="shortcut-card-item shortcut-card-full-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSearchParams({ tab: "connected-apps" })}
                  >
                    <ShortcutCard
                      icon={<FiBarChart2 />}
                      title="Sync all my sports activities"
                      description="Connect your trackers to gather all registered sport activities and achievements"
                      full
                    />
                  </div>
                </div>
              </section>

              {/* FOOTER */}
              <footer className="profile-footer">
                <p>
                  Website protected by reCAPTCHA: the <span>privacy policy</span>{" "}
                  and the <span>terms of use</span> of Google apply.
                </p>
                <div className="footer-links">
                  <span>Cookie Management</span>
                  <span>Accessibility: partially compliant</span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>

      {/* ==================================================
          FIELD EDIT MODAL
      ================================================== */}
      {editModal.open && (
        <div className="pi-modal-backdrop" onClick={closeEditModal}>
          <div className="pi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pi-modal-header">
              <h3>{editModal.title}</h3>
              <button
                type="button"
                className="pi-modal-close"
                onClick={closeEditModal}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveField}>
              <div className="pi-modal-body">
                {editModal.field === "name" && (
                  <>
                    <div className="pi-field-group">
                      <label className="pi-field-label">First Name</label>
                      <input
                        type="text"
                        className="pi-input"
                        placeholder="e.g. Rahul"
                        value={editModal.firstName}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        required
                        autoFocus
                      />
                    </div>
                    <div className="pi-field-group">
                      <label className="pi-field-label">Last Name</label>
                      <input
                        type="text"
                        className="pi-input"
                        placeholder="e.g. Chib"
                        value={editModal.lastName}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                {editModal.field === "dob" && (
                  <div className="pi-field-group">
                    <label className="pi-field-label">Date of Birth</label>
                    <input
                      type="date"
                      className="pi-input"
                      value={editModal.dob}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          dob: e.target.value,
                        }))
                      }
                      required
                      autoFocus
                    />
                  </div>
                )}

                {editModal.field === "gender" && (
                  <div className="pi-field-group">
                    <label className="pi-field-label">Select Gender</label>
                    <div className="pi-radio-group">
                      {["Male", "Female", "Other", "Prefer not to say"].map(
                        (g) => (
                          <label key={g} className="pi-radio-label">
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={editModal.gender === g}
                              onChange={(e) =>
                                setEditModal((prev) => ({
                                  ...prev,
                                  gender: e.target.value,
                                }))
                              }
                            />
                            <span>{g}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                )}

                {editModal.field === "phone" && (
                  <div className="pi-field-group">
                    <label className="pi-field-label">Phone Number</label>
                    <input
                      type="tel"
                      className="pi-input"
                      placeholder="e.g. 09459940381"
                      value={editModal.phone}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      required
                      autoFocus
                    />
                  </div>
                )}

                {editModal.field === "email" && (
                  <div className="pi-field-group">
                    <label className="pi-field-label">Email Address</label>
                    <input
                      type="email"
                      className="pi-input"
                      placeholder="e.g. vk7184192@gmail.com"
                      value={editModal.email}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="pi-modal-footer">
                <button
                  type="button"
                  className="btn-pi-cancel"
                  onClick={closeEditModal}
                  disabled={savingField}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pi-save"
                  disabled={savingField}
                >
                  {savingField ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================
   SHORTCUT CARD
========================================================== */

const ShortcutCard = ({ icon, title, description, full = false }) => {
  return (
    <div className={`shortcut-card-modern ${full ? "shortcut-card-modern-full" : ""}`}>
      <div className="shortcut-icon-circle">{icon}</div>

      <div className="shortcut-meta">
        <h3 className="shortcut-name">{title}</h3>
        <p className="shortcut-desc">{description}</p>
      </div>

      <div className="shortcut-arrow-circle">
        <FiChevronRight />
      </div>
    </div>
  );
};

export default Profile;
