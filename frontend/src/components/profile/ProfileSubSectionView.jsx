import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiCheck, FiAlertTriangle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios";

const SPORTS_LIST = [
  "Running",
  "Cycling",
  "Hiking & Trekking",
  "Fitness & Gym",
  "Swimming",
  "Football",
  "Badminton",
  "Yoga",
  "Cricket",
  "Camping",
  "Tennis",
  "Skating",
];

const STORES_LIST = [
  "Decathlon Zirakpur (Chandigarh)",
  "Decathlon Mohali",
  "Decathlon Ludhiana",
  "Decathlon Ambience Mall (Gurugram)",
  "Decathlon Rohini (New Delhi)",
  "Decathlon Noida",
  "Decathlon Bengaluru Bannerghatta",
  "Decathlon Mumbai Thane",
];

const FITNESS_APPS = [
  { id: "strava", name: "Strava", desc: "Sync runs, rides, and outdoor activities." },
  { id: "garmin", name: "Garmin Connect", desc: "Sync workouts and performance metrics." },
  { id: "google-fit", name: "Google Fit", desc: "Sync daily steps and active minutes." },
  { id: "apple-health", name: "Apple Health", desc: "Sync health and activity rings." },
];

const STORAGE_KEY = "decathlon_profile_settings";

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "your registered email";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(4, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 4))}@${domain}`;
};

const ProfileSubSectionView = ({ activeTab, userEmail, onBack, onLogout }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => ({
    favouriteStore: "Decathlon Zirakpur (Chandigarh)",
    favouriteSports: ["Running", "Fitness & Gym"],
    connectedApps: {},
    topSize: "M",
    bottomSize: "32",
    shoeSize: "UK 8",
    productRecommendations: true,
    loyaltyJoined: true,
    visitedWebsitesTracking: true,
    thirdPartyAccess: { google: true, stripe: true },
    ...loadSettings(),
  }));

  const [deleteStep, setDeleteStep] = useState("info"); // 'info' | 'method' | 'verify'
  const [deleteOtp, setDeleteOtp] = useState("");
  const [sendingDeleteOtp, setSendingDeleteOtp] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (activeTab !== "delete-account") {
      setDeleteStep("info");
      setDeleteOtp("");
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  const updateSetting = (key, value, message) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (message) toast.success(message);
  };

  const toggleSport = (sport) => {
    setSettings((prev) => {
      const exists = prev.favouriteSports.includes(sport);
      const next = exists
        ? prev.favouriteSports.filter((s) => s !== sport)
        : [...prev.favouriteSports, sport];
      return { ...prev, favouriteSports: next };
    });
  };

  const toggleApp = (appId, appName) => {
    setSettings((prev) => {
      const nextConnected = !prev.connectedApps[appId];
      toast.success(
        nextConnected ? `${appName} connected` : `${appName} disconnected`
      );
      return {
        ...prev,
        connectedApps: { ...prev.connectedApps, [appId]: nextConnected },
      };
    });
  };

  const renderBody = () => {
    switch (activeTab) {
      case "favourite-store":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Favourite store</h1>
            <p className="subview-subtitle">
              Choose your preferred Decathlon store for quick stock checks, Click &amp; Collect, and local events.
            </p>
            <div className="subview-list">
              {STORES_LIST.map((store) => {
                const selected = settings.favouriteStore === store;
                return (
                  <button
                    key={store}
                    type="button"
                    className={`subview-option-row ${selected ? "selected" : ""}`}
                    onClick={() =>
                      updateSetting("favouriteStore", store, `Favourite store set to ${store}`)
                    }
                  >
                    <span>{store}</span>
                    {selected && <FiCheck className="subview-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "favourite-sports":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Favourite sports</h1>
            <p className="subview-subtitle">
              Tell us which sports you practice so we can tailor gear, guides, and events for you.
            </p>
            <div className="subview-chips">
              {SPORTS_LIST.map((sport) => {
                const active = settings.favouriteSports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    className={`subview-chip ${active ? "active" : ""}`}
                    onClick={() => toggleSport(sport)}
                  >
                    {active && <FiCheck />}
                    <span>{sport}</span>
                  </button>
                );
              })}
            </div>
            <div className="subview-actions">
              <button
                type="button"
                className="subview-primary-btn"
                onClick={() => toast.success("Favourite sports saved")}
              >
                Save sports preferences
              </button>
            </div>
          </div>
        );

      case "connected-apps":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Connected apps</h1>
            <p className="subview-subtitle">
              Connect your fitness apps to sync sports activities and earn Sporty Rewards points.
            </p>
            <div className="subview-rows">
              {FITNESS_APPS.map((app) => {
                const connected = Boolean(settings.connectedApps[app.id]);
                return (
                  <div key={app.id} className="subview-toggle-row">
                    <div>
                      <h3>{app.name}</h3>
                      <p>{app.desc}</p>
                    </div>
                    <button
                      type="button"
                      className={connected ? "subview-outline-btn" : "subview-primary-btn"}
                      onClick={() => toggleApp(app.id, app.name)}
                    >
                      {connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "size-guide":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Your size guide</h1>
            <p className="subview-subtitle">
              Save your regular sizes for faster product selection across apparel and footwear.
            </p>
            <div className="subview-form-grid">
              <label className="subview-field">
                <span>Tops &amp; T-Shirts</span>
                <select
                  value={settings.topSize}
                  onChange={(e) => updateSetting("topSize", e.target.value)}
                >
                  {["XS", "S", "M", "L", "XL", "2XL"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="subview-field">
                <span>Bottoms / Waist</span>
                <select
                  value={settings.bottomSize}
                  onChange={(e) => updateSetting("bottomSize", e.target.value)}
                >
                  {["28", "30", "32", "34", "36", "38"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="subview-field">
                <span>Footwear (UK)</span>
                <select
                  value={settings.shoeSize}
                  onChange={(e) => updateSetting("shoeSize", e.target.value)}
                >
                  {["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="subview-actions">
              <button
                type="button"
                className="subview-primary-btn"
                onClick={() => toast.success("Size preferences saved")}
              >
                Save sizes
              </button>
            </div>
          </div>
        );

      case "product-recommendations":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Product recommendations</h1>
            <p className="subview-subtitle">
              Control whether we use your sports profile and browsing history to recommend products.
            </p>
            <div className="subview-toggle-row">
              <div>
                <h3>Personalized product recommendations</h3>
                <p>Show gear tailored to your favourite sports and past orders.</p>
              </div>
              <button
                type="button"
                className={settings.productRecommendations ? "subview-primary-btn" : "subview-outline-btn"}
                onClick={() =>
                  updateSetting(
                    "productRecommendations",
                    !settings.productRecommendations,
                    `Product recommendations ${!settings.productRecommendations ? "enabled" : "disabled"}`
                  )
                }
              >
                {settings.productRecommendations ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        );

      case "loyalty-program":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Join our loyalty program</h1>
            <p className="subview-subtitle">
              Earn points on every purchase and sports activity, and redeem them for vouchers.
            </p>
            <div className="subview-toggle-row">
              <div>
                <h3>Decathlon Membership &amp; Sporty Rewards</h3>
                <p>
                  {settings.loyaltyJoined
                    ? "You are currently enrolled in the Decathlon loyalty program."
                    : "Enroll for free to start collecting points on purchases."}
                </p>
              </div>
              <button
                type="button"
                className={settings.loyaltyJoined ? "subview-outline-btn" : "subview-primary-btn"}
                onClick={() =>
                  updateSetting(
                    "loyaltyJoined",
                    !settings.loyaltyJoined,
                    settings.loyaltyJoined
                      ? "Left loyalty program"
                      : "Joined Decathlon loyalty program!"
                  )
                }
              >
                {settings.loyaltyJoined ? "Enrolled" : "Join now"}
              </button>
            </div>
          </div>
        );

      case "visited-websites":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Visited websites &amp; apps</h1>
            <p className="subview-subtitle">
              Manage how Decathlon websites and mobile apps remember your activity for a smoother experience.
            </p>
            <div className="subview-toggle-row">
              <div>
                <h3>Activity &amp; cookie personalization</h3>
                <p>Allow saving recently viewed items and category preferences across sessions.</p>
              </div>
              <button
                type="button"
                className={settings.visitedWebsitesTracking ? "subview-primary-btn" : "subview-outline-btn"}
                onClick={() =>
                  updateSetting(
                    "visitedWebsitesTracking",
                    !settings.visitedWebsitesTracking,
                    "Website & app activity preference updated"
                  )
                }
              >
                {settings.visitedWebsitesTracking ? "Allowed" : "Paused"}
              </button>
            </div>
          </div>
        );

      case "third-party-access":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Manage third-party access</h1>
            <p className="subview-subtitle">
              Review external services linked to your Decathlon account.
            </p>
            <div className="subview-rows">
              <div className="subview-toggle-row">
                <div>
                  <h3>Google Sign-In</h3>
                  <p>Used for one-click authentication with your Google account.</p>
                </div>
                <button
                  type="button"
                  className={settings.thirdPartyAccess?.google ? "subview-outline-btn" : "subview-primary-btn"}
                  onClick={() => {
                    const next = !settings.thirdPartyAccess?.google;
                    updateSetting(
                      "thirdPartyAccess",
                      { ...settings.thirdPartyAccess, google: next },
                      next ? "Google Sign-In access enabled" : "Google Sign-In access revoked"
                    );
                  }}
                >
                  {settings.thirdPartyAccess?.google ? "Revoke" : "Allow"}
                </button>
              </div>
            </div>
          </div>
        );

      case "device-connections":
        return (
          <div className="subview-card">
            <h1 className="subview-title">Manage device connections</h1>
            <p className="subview-subtitle">
              Devices currently signed in to your Decathlon account.
            </p>
            <div className="subview-rows">
              <div className="subview-toggle-row">
                <div>
                  <h3>Current Browser Session</h3>
                  <p>{navigator.userAgent.split(")")[0]}) • Active now</p>
                </div>
                <span className="subview-badge-active">Active</span>
              </div>
            </div>
            <div className="subview-actions">
              <button
                type="button"
                className="subview-outline-btn"
                onClick={() => {
                  toast.success("Signed out of this session");
                  onLogout();
                }}
              >
                Sign out from this device
              </button>
            </div>
          </div>
        );

      case "delete-account": {
        const handleSendDeleteOtp = async () => {
          const token = localStorage.getItem("token");
          try {
            setSendingDeleteOtp(true);
            const res = await api.post(
              "/user/account/delete-otp",
              {},
              token ? { headers: { Authorization: `Bearer ${token}` } } : {}
            );
            toast.success(res.data?.message || "Verification code sent to your email");
            setDeleteStep("verify");
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send verification code");
          } finally {
            setSendingDeleteOtp(false);
          }
        };

        const handleConfirmDeleteAccount = async (e) => {
          e.preventDefault();
          if (!deleteOtp.trim()) {
            toast.error("Please enter the verification code sent to your email");
            return;
          }
          const token = localStorage.getItem("token");
          try {
            setDeletingAccount(true);
            const res = await api.delete("/user/account", {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              data: { otp: deleteOtp.trim() },
            });
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("decathlon_profile_settings");
            localStorage.removeItem("decathlon_recent_searches");
            localStorage.removeItem("decathlon_delivery_location");
            window.dispatchEvent(new Event("authChanged"));
            toast.success(res.data?.message || "Your account has been permanently deleted");
            navigate("/", { replace: true });
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete account");
          } finally {
            setDeletingAccount(false);
          }
        };

        return (
          <div className="subview-card subview-danger-card">
            <div className="subview-danger-header">
              <FiAlertTriangle />
              <h1 className="subview-title">Delete my account</h1>
            </div>

            {deleteStep === "info" && (
              <>
                <p className="subview-subtitle">
                  You are about to request the deletion of your Decathlon account.{" "}
                  <strong>
                    If you continue with this deletion process, you will lose access to all Decathlon
                    services through this account and your personal data (profile, saved addresses,
                    wishlist, and loyalty points) will be permanently deleted.
                  </strong>
                </p>
                <p className="subview-subtitle">
                  To complete the deletion of your account, you will be asked to confirm your identity
                  by entering a one-time verification code sent to your registered email address.
                </p>
                <div className="subview-actions">
                  <button
                    type="button"
                    className="subview-primary-btn"
                    onClick={() => setDeleteStep("method")}
                  >
                    Delete my account
                  </button>
                </div>
              </>
            )}

            {deleteStep === "method" && (
              <>
                <p className="subview-subtitle">
                  Choose a communication method to receive a one-time code to confirm the deletion of
                  your account:
                </p>
                <div className="subview-list">
                  <label className="subview-option-row selected" style={{ justifyContent: "flex-start", gap: "10px" }}>
                    <input type="radio" name="delete-otp-method" checked readOnly />
                    <span>By email at {maskEmail(userEmail)}</span>
                  </label>
                </div>
                <div className="subview-actions">
                  <button
                    type="button"
                    className="subview-primary-btn"
                    disabled={sendingDeleteOtp}
                    onClick={handleSendDeleteOtp}
                  >
                    {sendingDeleteOtp ? "Sending code..." : "Receive a one-time code"}
                  </button>
                  <button
                    type="button"
                    className="subview-outline-btn"
                    disabled={sendingDeleteOtp}
                    onClick={() => setDeleteStep("info")}
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {deleteStep === "verify" && (
              <form onSubmit={handleConfirmDeleteAccount}>
                <p className="subview-subtitle">
                  Enter the 6-digit verification code sent to <strong>{maskEmail(userEmail)}</strong>{" "}
                  to permanently delete your account.
                </p>
                <label className="subview-field">
                  <span>One-time verification code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={deleteOtp}
                    onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    disabled={deletingAccount}
                    required
                  />
                </label>
                <div className="subview-actions">
                  <button
                    type="submit"
                    className="subview-danger-btn"
                    disabled={deletingAccount || deleteOtp.trim().length < 6}
                  >
                    {deletingAccount ? "Deleting account..." : "Confirm & Delete Account"}
                  </button>
                  <button
                    type="button"
                    className="subview-outline-btn"
                    disabled={sendingDeleteOtp || deletingAccount}
                    onClick={handleSendDeleteOtp}
                  >
                    {sendingDeleteOtp ? "Sending..." : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="profile-subview-container">
      <button type="button" className="back-to-profile-btn" onClick={onBack}>
        <FiChevronLeft /> Back to profile shortcuts
      </button>
      {renderBody()}
    </div>
  );
};

export default ProfileSubSectionView;
