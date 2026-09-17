import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAccountCircle,
  MdEmail,
  MdPhone,
  MdBadge,
  MdLock,
  MdSecurity,
  MdNotifications,
  MdDevices,
  MdSave,
  MdVisibility,
  MdVisibilityOff,
  MdCheckCircle,
  MdStorefront,
  MdLogout,
  MdShield,
  MdKey,
  MdCameraAlt,
  MdDeleteOutline,
  MdCloudUpload,
  MdClose,
  MdCheck,
  MdLink,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/AdminProfile.css";

// Curated Decathlon Sports Avatars
const PRESET_AVATARS = [
  {
    id: "runner",
    name: "Runner",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "cyclist",
    name: "Cyclist",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "climber",
    name: "Climber",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "trainer",
    name: "Trainer",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "trekker",
    name: "Trekker",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "executive",
    name: "Manager",
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&auto=format&fit=crop&q=80",
  },
];

const AdminProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Active Tab: "general" | "security" | "notifications" | "sessions"
  const [activeTab, setActiveTab] = useState("general");

  // Profile State
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin",
    designation: "Store Administrator",
    avatar: "",
    createdAt: "",
  });

  // Password State
  const [passData, setPassData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Store Notifications & System Preferences (stored in localStorage)
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("adminPreferences");
      return saved
        ? JSON.parse(saved)
        : {
            lowStockAlerts: true,
            orderNotifications: true,
            emailDigest: true,
            aiChatbotAlerts: true,
            soundEffects: false,
          };
    } catch {
      return {
        lowStockAlerts: true,
        orderNotifications: true,
        emailDigest: true,
        aiChatbotAlerts: true,
        soundEffects: false,
      };
    }
  });

  // Fetch admin profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/profile");
      if (res.data?.user) {
        const u = res.data.user;
        setProfile({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          role: u.role || "admin",
          designation: u.designation || "Store Administrator",
          avatar: u.avatar || "",
          createdAt: u.createdAt || "",
        });
        setAvatarPreview(u.avatar || "");

        // Sync to localStorage
        localStorage.setItem("adminUser", JSON.stringify(u));
        window.dispatchEvent(new Event("adminUserUpdated"));
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      // Fallback from localStorage
      try {
        const localUser = JSON.parse(localStorage.getItem("adminUser"));
        if (localUser) {
          setProfile((prev) => ({
            ...prev,
            name: localUser.name || "Vijay Admin",
            email: localUser.email || "admin@decathlon.com",
            phone: localUser.phone || "",
            role: localUser.role || "admin",
            designation: localUser.designation || "Store Administrator",
            avatar: localUser.avatar || "",
          }));
          setAvatarPreview(localUser.avatar || "");
        }
      } catch (e) {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Profile Input
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setProfile((prev) => ({ ...prev, avatar: "" }));
    toast.success("Image selected! Click 'Save Changes' to apply.");
    setAvatarModalOpen(false);
  };

  // Select Preset Avatar
  const handleSelectPreset = (url) => {
    setSelectedFile(null);
    setAvatarPreview(url);
    setProfile((prev) => ({ ...prev, avatar: url }));
    toast.success("Avatar selected! Click 'Save Changes' to apply.");
    setAvatarModalOpen(false);
  };

  // Apply Custom URL
  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    const url = customUrlInput.trim();
    if (!url) return;
    setSelectedFile(null);
    setAvatarPreview(url);
    setProfile((prev) => ({ ...prev, avatar: url }));
    setCustomUrlInput("");
    toast.success("Image URL applied! Click 'Save Changes' to apply.");
    setAvatarModalOpen(false);
  };

  // Remove Avatar (Revert to initial)
  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    setAvatarPreview("");
    setProfile((prev) => ({ ...prev, avatar: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Avatar removed. Initial will be displayed.");
    setAvatarModalOpen(false);
  };

  // Save Profile Updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSavingProfile(true);
      let res;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("name", profile.name.trim());
        formData.append("email", profile.email.trim());
        formData.append("phone", profile.phone.trim());
        formData.append("designation", profile.designation.trim());
        formData.append("avatar", selectedFile);

        res = await api.put("/auth/profile", formData);
      } else {
        res = await api.put("/auth/profile", {
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          designation: profile.designation.trim(),
          avatar: profile.avatar.trim(),
        });
      }

      if (res.data?.user) {
        const updated = res.data.user;
        setProfile((prev) => ({
          ...prev,
          ...updated,
        }));
        setAvatarPreview(updated.avatar || "");
        setSelectedFile(null);

        localStorage.setItem("adminUser", JSON.stringify(updated));
        window.dispatchEvent(new Event("adminUserUpdated"));

        toast.success("Admin profile & photo updated successfully!");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setChangingPass(true);
      const res = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success(res.data?.message || "Password updated successfully!");
      setPassData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Change password error:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  // Toggle Preferences
  const togglePreference = (key) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("adminPreferences", JSON.stringify(updated));
      toast.success("Notification preferences updated");
      return updated;
    });
  };

  // Password Strength Evaluator
  const passStrength = useMemo(() => {
    const p = passData.newPassword;
    if (!p) return { label: "None", score: 0, color: "#94a3b8" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 2) return { label: "Weak", score: 33, color: "#ef4444" };
    if (score <= 4) return { label: "Moderate", score: 66, color: "#f59e0b" };
    return { label: "Strong", score: 100, color: "#10b981" };
  }, [passData.newPassword]);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="admin-profile-page">
      {/* HIDDEN FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/jpg"
        style={{ display: "none" }}
      />

      {/* PROFILE HEADER HERO */}
      <div className="profile-hero-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-wrapper">
            <div
              className="profile-large-avatar"
              onClick={() => setAvatarModalOpen(true)}
              title="Click to change profile picture"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={profile.name || "Admin"}
                  className="profile-avatar-image"
                  onError={() => setAvatarPreview("")}
                />
              ) : (
                profile.name?.charAt(0)?.toUpperCase() || "A"
              )}
              <div className="avatar-edit-overlay">
                <MdCameraAlt />
              </div>
            </div>
            <div className="profile-online-badge" title="Active Admin Session"></div>
          </div>

          <div className="profile-hero-text">
            <div className="profile-hero-tags">
              <span className="badge-role">
                <MdShield /> {profile.role?.toUpperCase() || "SUPER ADMIN"}
              </span>
              <span className="badge-verified">
                <MdCheckCircle /> Verified Authority
              </span>
            </div>
            <h1>{profile.name || "Vijay Admin"}</h1>
            <p className="profile-hero-sub">
              {profile.designation || "Store Administrator"} • Decathlon Enterprise Control
            </p>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="btn-profile-hero btn-hero-change-photo"
            onClick={() => setAvatarModalOpen(true)}
          >
            <MdCameraAlt /> Change Photo
          </button>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-profile-hero btn-hero-secondary"
          >
            <MdStorefront /> View Store
          </a>
          <button
            type="button"
            className="btn-profile-hero btn-hero-danger"
            onClick={handleLogout}
          >
            <MdLogout /> Logout
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION STRIP */}
      <div className="profile-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <MdAccountCircle />
          <span>General Info</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <MdKey />
          <span>Change Password</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <MdNotifications />
          <span>System Alerts</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          <MdDevices />
          <span>Security & Sessions</span>
        </button>
      </div>

      {/* TAB PANELS */}
      <div className="profile-tab-content">
        {/* =========================================================
            TAB 1: GENERAL PROFILE INFORMATION
            ========================================================= */}
        {activeTab === "general" && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Personal & Management Credentials</h2>
                <p>Update your administrator contact details, store designation, and photo</p>
              </div>
            </div>

            {/* Quick Avatar Change Preview in Form */}
            <div className="avatar-quick-banner">
              <div className="quick-avatar-thumb">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" />
                ) : (
                  <span>{profile.name?.charAt(0)?.toUpperCase() || "A"}</span>
                )}
              </div>
              <div className="quick-avatar-info">
                <h4>Profile Avatar</h4>
                <p>PNG, JPG, or WEBP. Maximum file size 5MB.</p>
              </div>
              <div className="quick-avatar-actions">
                <button
                  type="button"
                  className="btn-avatar-action btn-upload-now"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <MdCloudUpload /> Upload New Image
                </button>
                <button
                  type="button"
                  className="btn-avatar-action btn-choose-preset"
                  onClick={() => setAvatarModalOpen(true)}
                >
                  Choose Preset
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    className="btn-avatar-action btn-remove-photo"
                    onClick={handleRemoveAvatar}
                    title="Remove Photo"
                  >
                    <MdDeleteOutline /> Remove
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="admin-name">
                    <MdBadge /> Full Name
                  </label>
                  <input
                    type="text"
                    id="admin-name"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    placeholder="e.g. Vijay Kumar"
                    required
                  />
                  <span className="input-hint">Displayed in top navigation and activity logs</span>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-email">
                    <MdEmail /> Email Address
                  </label>
                  <input
                    type="email"
                    id="admin-email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="admin@decathlon.com"
                  />
                  <span className="input-hint">Used for admin authentication and system reports</span>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-phone">
                    <MdPhone /> Contact Phone
                  </label>
                  <input
                    type="text"
                    id="admin-phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    placeholder="+91 98765 43210"
                  />
                  <span className="input-hint">Emergency operational contact number</span>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-designation">
                    <MdSecurity /> Designation / Title
                  </label>
                  <input
                    type="text"
                    id="admin-designation"
                    name="designation"
                    value={profile.designation}
                    onChange={handleProfileChange}
                    placeholder="e.g. Head of Sports Catalog"
                  />
                  <span className="input-hint">Official title across Decathlon store operations</span>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit-profile"
                  disabled={savingProfile || loading}
                >
                  <MdSave /> {savingProfile ? "Saving Updates..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================
            TAB 2: SECURITY & CHANGE PASSWORD
            ========================================================= */}
        {activeTab === "security" && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Change Administrator Password</h2>
                <p>Protect your store controls with a strong, rotated credentials pass</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-stack">
                {/* Current Password */}
                <div className="form-group">
                  <label htmlFor="current-pass">
                    <MdLock /> Current Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      id="current-pass"
                      value={passData.currentPassword}
                      onChange={(e) =>
                        setPassData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter existing password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                    >
                      {showCurrentPass ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="new-pass">
                    <MdKey /> New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPass ? "text" : "password"}
                      id="new-pass"
                      value={passData.newPassword}
                      onChange={(e) =>
                        setPassData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password (min. 6 characters)"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {passData.newPassword && (
                    <div className="strength-meter-wrap">
                      <div className="strength-bar-track">
                        <div
                          className="strength-bar-fill"
                          style={{
                            width: `${passStrength.score}%`,
                            background: passStrength.color,
                          }}
                        ></div>
                      </div>
                      <span
                        className="strength-label"
                        style={{ color: passStrength.color }}
                      >
                        Strength: <strong>{passStrength.label}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label htmlFor="confirm-pass">
                    <MdLock /> Confirm New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      id="confirm-pass"
                      value={passData.confirmPassword}
                      onChange={(e) =>
                        setPassData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                    >
                      {showConfirmPass ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  {passData.confirmPassword &&
                    passData.confirmPassword !== passData.newPassword && (
                      <span className="text-warning-match">
                        Passwords do not match
                      </span>
                    )}
                </div>
              </div>

              {/* Security Best Practices Card */}
              <div className="security-tips-card">
                <MdShield className="tips-icon" />
                <div>
                  <h4>Recommended Password Standards</h4>
                  <ul>
                    <li>Use at least 8 characters with upper and lower case letters</li>
                    <li>Include numeric digits and special symbols (@, #, $, !)</li>
                    <li>Avoid reusing previous credentials or common words</li>
                  </ul>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit-profile"
                  disabled={changingPass}
                >
                  <MdKey /> {changingPass ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================
            TAB 3: SYSTEM NOTIFICATIONS & ALERTS
            ========================================================= */}
        {activeTab === "notifications" && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Store Management Notifications</h2>
                <p>Fine-tune which operational alerts trigger real-time notifications</p>
              </div>
            </div>

            <div className="preferences-list">
              <div className="pref-item">
                <div className="pref-info">
                  <h4>Low Stock Inventory Alerts</h4>
                  <p>Trigger warnings whenever product stock falls below 15 units</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.lowStockAlerts}
                    onChange={() => togglePreference("lowStockAlerts")}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="pref-item">
                <div className="pref-info">
                  <h4>Real-time Order Notifications</h4>
                  <p>Instant notification upon receipt of a new customer checkout</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.orderNotifications}
                    onChange={() => togglePreference("orderNotifications")}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="pref-item">
                <div className="pref-info">
                  <h4>Gemini AI Chatbot Inquiries</h4>
                  <p>Log and notify about customer AI shopping questions & queries</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.aiChatbotAlerts}
                    onChange={() => togglePreference("aiChatbotAlerts")}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="pref-item">
                <div className="pref-info">
                  <h4>Daily Executive Summary</h4>
                  <p>Send consolidated revenue and inventory reports every morning</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailDigest}
                    onChange={() => togglePreference("emailDigest")}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: SECURITY & SESSIONS
            ========================================================= */}
        {activeTab === "sessions" && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Active Sessions & Access Telemetry</h2>
                <p>Review current administrator device connections and privileges</p>
              </div>
            </div>

            <div className="session-cards-stack">
              <div className="session-item current-session">
                <div className="session-icon">
                  <MdDevices />
                </div>
                <div className="session-details">
                  <div className="session-title-line">
                    <h4>Current Chrome Session (Windows)</h4>
                    <span className="badge-active-now">Active Now</span>
                  </div>
                  <p>IP: 127.0.0.1 • Authorized via Decathlon Enterprise JWT</p>
                  <span className="session-time">
                    Token expires in 24 hours (automatic sliding refresh)
                  </span>
                </div>
              </div>
            </div>

            <div className="privileges-box">
              <h4>Assigned Administrative Privileges</h4>
              <div className="privilege-chips">
                <span className="priv-chip">Catalog Management</span>
                <span className="priv-chip">Order Processing</span>
                <span className="priv-chip">User Directory</span>
                <span className="priv-chip">Hero Banners</span>
                <span className="priv-chip">Dynamic Pages</span>
                <span className="priv-chip">Gemini AI Knowledge Base</span>
              </div>
            </div>

            <div className="danger-zone-card">
              <div className="danger-info">
                <h4>Terminate Current Session</h4>
                <p>Logs you out immediately and clears stored tokens from this browser.</p>
              </div>
              <button
                type="button"
                className="btn-danger-logout"
                onClick={handleLogout}
              >
                <MdLogout /> End Session & Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          AVATAR PICKER MODAL
          ========================================================= */}
      {avatarModalOpen && (
        <div className="avatar-modal-overlay" onClick={() => setAvatarModalOpen(false)}>
          <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-modal-header">
              <div>
                <h3>Select Profile Avatar</h3>
                <p>Choose an athlete avatar, upload from device, or paste image URL</p>
              </div>
              <button
                type="button"
                className="avatar-modal-close"
                onClick={() => setAvatarModalOpen(false)}
              >
                <MdClose />
              </button>
            </div>

            <div className="avatar-modal-body">
              {/* Option 1: Upload from Device */}
              <div className="modal-upload-section">
                <button
                  type="button"
                  className="btn-modal-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <MdCloudUpload />
                  <span>Choose Image File from Computer</span>
                </button>
                <span className="upload-file-hint">Supports PNG, JPG, WEBP (Max 5MB)</span>
              </div>

              <div className="modal-divider">
                <span>OR CHOOSE A DECATHLON SPORTS PRESET</span>
              </div>

              {/* Option 2: Curated Sports Presets */}
              <div className="presets-grid">
                {PRESET_AVATARS.map((preset) => (
                  <div
                    key={preset.id}
                    className={`preset-card ${
                      avatarPreview === preset.url ? "selected" : ""
                    }`}
                    onClick={() => handleSelectPreset(preset.url)}
                  >
                    <img src={preset.url} alt={preset.name} />
                    <span>{preset.name}</span>
                    {avatarPreview === preset.url && (
                      <div className="preset-selected-check">
                        <MdCheck />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-divider">
                <span>OR ENTER DIRECT IMAGE URL</span>
              </div>

              {/* Option 3: Direct URL */}
              <form className="modal-url-form" onSubmit={handleApplyCustomUrl}>
                <div className="url-input-wrap">
                  <MdLink />
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                  />
                </div>
                <button type="submit" className="btn-apply-url">
                  Apply
                </button>
              </form>

              {/* Option 4: Remove photo if exists */}
              {avatarPreview && (
                <div className="modal-remove-section">
                  <button
                    type="button"
                    className="btn-modal-remove"
                    onClick={handleRemoveAvatar}
                  >
                    <MdDeleteOutline /> Remove Current Photo & Use Initial
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
