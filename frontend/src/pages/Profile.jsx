import React, { useState, useEffect, useCallback } from "react";
import {
  FiExternalLink,
  FiPlus,
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
} from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
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

  const [user, setUser] = useState({
    name: "",
    email: "vk7184192@gmail.com",
    phone: "09459940381",
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
        <Link to="/" className="decathlon-logo" style={{ textDecoration: "none" }}>
          <div className="decathlon-logo-mark">
            <span></span>
          </div>
          <span className="decathlon-logo-text">DECATHLON</span>
        </Link>
      </header>

      {/* ==================================================
          PAGE LAYOUT
      ================================================== */}
      <div className="profile-layout">
        {/* ==================================================
            SIDEBAR
        ================================================== */}
        <aside className="profile-sidebar">
          {/* USER BOX */}
          <div className="profile-user-box">
            <h2>Welcome</h2>
            <p className="profile-email">{user.email || "vk7184192@gmail.com"}</p>
            <div className="profile-points">
              <strong>0</strong>
              <span>point</span>
            </div>
            <button type="button" className="redeem-btn">
              Redeem points
            </button>
          </div>

          {/* SIDEBAR MENU */}
          <div className="profile-menu">
            {/* PURCHASES */}
            <div className="menu-section">
              <h3>Purchases</h3>
              <Link
                to="/account/orders-returns?tab=order-returns"
                className="menu-item menu-link-external"
              >
                <span>Track your orders &amp; returns</span>
                <FiExternalLink />
              </Link>
              <div className="menu-item">
                <span>Gift cards</span>
                <FiExternalLink />
              </div>
            </div>

            {/* LOYALTY */}
            <div className="menu-section">
              <h3>Loyalty</h3>
              <div
                className={`menu-link ${isDecathlonCard ? "active-link" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchParams({ tab: "decathlon-card" })}
              >
                Loyalty card
              </div>
              <div className="menu-link">Rewards shop</div>
              <div className="menu-link">Unlocked rewards</div>
              <div className="menu-link">Earn more points</div>
              <div className="menu-link">Sport sessions</div>
              <div className="menu-link">My points history</div>
            </div>

            {/* PROFILE */}
            <div className="menu-section profile-menu-section">
              <h3
                className="active-menu"
                style={{ cursor: "pointer" }}
                onClick={() => setSearchParams({})}
              >
                Profile
              </h3>
              <div
                className={`menu-link ${isPersonalInfo ? "active-link" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchParams({ tab: "personal-information" })}
              >
                Personal information
              </div>
              <div
                className={`menu-link ${isNotificationPrefs ? "active-link" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchParams({ tab: "notifications-preferences" })}
              >
                Notifications preferences
              </div>
              <div className="menu-link menu-with-icon">
                <span>Personalization</span>
                <FiPlus />
              </div>
              <div className="menu-link menu-with-icon">
                <span>Privacy and security</span>
                <FiPlus />
              </div>
            </div>

            {/* LOGOUT */}
            <div
              className="logout"
              style={{ cursor: "pointer" }}
              onClick={handleLogout}
            >
              Logout
            </div>

            {/* CARD NUMBER */}
            <div
              className="card-number"
              style={{ cursor: "pointer" }}
              onClick={() => setSearchParams({ tab: "decathlon-card" })}
            >
              Card number: {user.cardNumber?.replace(/\s+/g, "") || "2094724479967"}
            </div>
          </div>
        </aside>

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}
        <main className="profile-content">
          {isNotificationPrefs ? (
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
                  <div className="decathlon-logo-mark">
                    <span></span>
                  </div>
                  <span className="decathlon-logo-text">DECATHLON</span>
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
               PERSONAL INFORMATION VIEW (MATCHING DECATHLON OFFICIAL)
            ================================================== */
            <div className="personal-info-container">
              {/* BACK TO PROFILE BREADCRUMB */}
              <button
                type="button"
                className="back-to-profile-btn"
                onClick={() => setSearchParams({})}
              >
                <FiChevronLeft /> Profile information
              </button>

              <h1 className="personal-info-title">Personal information</h1>

              {/* MY IDENTITY SECTION */}
              <div className="personal-info-section">
                <h2 className="personal-info-section-title">My identity</h2>

                <div className="personal-info-card">
                  {/* FIRST NAME AND LAST NAME */}
                  <div className="personal-info-row">
                    <div className="personal-info-left">
                      <span className="personal-info-label">
                        First Name and Last Name
                      </span>
                      <span
                        className={`personal-info-value ${
                          user.name ? "has-value" : ""
                        }`}
                      >
                        {user.name || "no information provided"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-field"
                      onClick={() => openEditModal("name")}
                    >
                      Edit
                    </button>
                  </div>

                  {/* DATE OF BIRTH */}
                  <div className="personal-info-row">
                    <div className="personal-info-left">
                      <span className="personal-info-label">Date of Birth</span>
                      <span
                        className={`personal-info-value ${
                          user.dob ? "has-value" : ""
                        }`}
                      >
                        {user.dob || "no information provided"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-field"
                      onClick={() => openEditModal("dob")}
                    >
                      Edit
                    </button>
                  </div>

                  {/* GENDER */}
                  <div className="personal-info-row">
                    <div className="personal-info-left">
                      <span className="personal-info-label">Gender</span>
                      <span
                        className={`personal-info-value ${
                          user.gender ? "has-value" : ""
                        }`}
                      >
                        {user.gender || "no information provided"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-field"
                      onClick={() => openEditModal("gender")}
                    >
                      Edit
                    </button>
                  </div>

                  {/* PHONE NUMBER */}
                  <div className="personal-info-row">
                    <div className="personal-info-left">
                      <span className="personal-info-label">Phone number</span>
                      <div className="personal-info-value has-value">
                        <span>{user.phone || "09459940381"}</span>
                        <span className="verified-badge">
                          <FiCheck /> Verified
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-field"
                      onClick={() => openEditModal("phone")}
                    >
                      Edit
                    </button>
                  </div>

                  {/* EMAIL ADDRESS */}
                  <div className="personal-info-row">
                    <div className="personal-info-left">
                      <span className="personal-info-label">Email address</span>
                      <span className="personal-info-value has-value">
                        {user.email || "vk7184192@gmail.com"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-field"
                      onClick={() => openEditModal("email")}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* MY DECATHLON CARD SECTION */}
              <div className="decathlon-card-section">
                <h2 className="personal-info-section-title">My Decathlon card</h2>
                <p className="decathlon-card-desc">
                  Your card number is an information specific to your account.
                  It can be used to authenticate in store and used in your
                  communications with the customer service.
                </p>

                <div
                  className="decathlon-card-box"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSearchParams({ tab: "decathlon-card" })}
                >
                  <div className="decathlon-card-info">
                    <span className="decathlon-card-label">Card number</span>
                    <span className="decathlon-card-digits">
                      {formatCardNumber(user.cardNumber)}
                    </span>
                  </div>
                  <div className="decathlon-card-arrow">
                    <FiChevronRight />
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
                <div className="welcome-area">
                  <div className="welcome-icon">
                    <FiUser />
                  </div>
                  <div className="welcome-text">
                    <h1>Welcome</h1>
                    <p>
                      Manage all your data in one place to fully enjoy all
                      Decathlon services
                    </p>
                  </div>
                </div>

                <div className="loyalty-card">
                  <div className="loyalty-new">New</div>
                  <h2>Loyalty program</h2>
                  <p>
                    Earn enough points and enjoy discounts on your next
                    purchases!
                  </p>
                  <button type="button" className="loyalty-button">
                    <span>Manage my loyalty program</span>
                    <FiExternalLink />
                  </button>
                </div>
              </section>

              {/* SPORTS BANNER */}
              <section className="sports-banner">
                <div className="sports-illustration">
                  <img
                    src="https://contents.mediadecathlon.com/s1212514/k$1defdc1cd8f187e0e3f69e07e288b033/step-1.svg"
                    alt="Synchronize sports activities"
                    className="sports-svg"
                  />
                </div>
                <div className="sports-content">
                  <h2>
                    Synchronize all your favorite sports trackers and
                    activities!
                  </h2>
                  <p>
                    If you use several sports trackers to register your
                    activities, this new feature is for you! Activate the
                    synchronization and gather all your activities in one place.
                  </p>
                  <button type="button" className="synchronize-btn">
                    Synchronize
                  </button>
                </div>
              </section>

              {/* SHORTCUTS */}
              <section className="shortcuts-section">
                <h2 className="shortcuts-title">Your shortcuts</h2>

                <div className="shortcut-grid">
                  <ShortcutCard
                    icon={<FiLock />}
                    title="Change my password"
                    description="A strong password will increase the security of your account"
                  />

                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSearchParams({ tab: "notifications-preferences" })
                    }
                  >
                    <ShortcutCard
                      icon={<FiMessageSquare />}
                      title="Communication preferences"
                      description="Choose your communication preferences, and the way you want to be contacted."
                    />
                  </div>

                  {/* EDIT MY PERSONAL PROFILE SHORTCUT */}
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSearchParams({ tab: "personal-information" })
                    }
                  >
                    <ShortcutCard
                      icon={<FiEdit3 />}
                      title="Edit my personal profile"
                      description="To keep it updated!"
                    />
                  </div>

                  <ShortcutCard
                    icon={<FiActivity />}
                    title="Manage my favorite sports"
                    description="Tell us more about your sports profile"
                  />

                  <ShortcutCard
                    icon={<FiBarChart2 />}
                    title="Sync all my sports activities"
                    description="To gather all your registered sport activities"
                    full
                  />
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
    <div className={`shortcut-card ${full ? "shortcut-card-full" : ""}`}>
      <div className="shortcut-icon">{icon}</div>

      <div className="shortcut-content">
        <h3>{title}</h3>

        <p>{description}</p>
      </div>
    </div>
  );
};

export default Profile;
