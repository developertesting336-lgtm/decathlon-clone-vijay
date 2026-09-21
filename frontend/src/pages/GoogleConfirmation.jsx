import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { IoHomeOutline } from "react-icons/io5";
import { FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/GoogleConfirmation.css";

const GoogleConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [authData] = useState(() => {
    // 1. Try router location state
    if (location.state?.confirmationToken && location.state?.email) {
      return {
        email: location.state.email,
        userExists: Boolean(location.state.userExists),
        confirmationToken: location.state.confirmationToken,
        from: location.state.from || "/",
      };
    }

    // 2. Fallback to sessionStorage for browser refresh persistence
    try {
      const stored = sessionStorage.getItem("decathlon_google_confirmation");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse stored Google confirmation state:", e);
    }

    return null;
  });

  useEffect(() => {
    if (!authData || !authData.confirmationToken) {
      toast.error("No pending Google confirmation found. Please sign in again.");
      navigate("/login", { replace: true });
    }
  }, [authData, navigate]);

  if (!authData || !authData.confirmationToken) {
    return null;
  }

  const { email, userExists, confirmationToken, from } = authData;

  const handleNext = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);

      const response = await api.post("/login/google/confirm", {
        confirmationToken,
      });

      const { token, user, message } = response.data || {};

      if (!token || !user) {
        throw new Error("Authentication response did not contain session token or user profile");
      }

      // Persist authenticated session
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Clean up temporary confirmation session
      try {
        sessionStorage.removeItem("decathlon_google_confirmation");
      } catch (err) {
        // ignore storage cleanup issues
      }

      // Dispatch global authentication and cart sync events
      window.dispatchEvent(new Event("authChanged"));
      window.dispatchEvent(new Event("cartUpdated"));

      toast.success(message || (userExists ? "Account linked and logged in!" : "Account created successfully!"));

      // Redirect user to their target destination
      navigate(from || "/", { replace: true });
    } catch (error) {
      console.error("Google Confirmation Error:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to complete Google authentication. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="google-confirm-page">
      {/* HEADER WITH LOGO & BACK BUTTON */}
      <header className="google-confirm-header">
        <button
          type="button"
          className="google-confirm-back"
          onClick={() => navigate("/login")}
          disabled={loading}
          aria-label="Back to login"
        >
          <IoHomeOutline />
          <span>Back</span>
        </button>

        <Link to="/" className="google-confirm-logo">
          <span className="google-confirm-logo-mark">D</span>
          <span>DECATHLON</span>
        </Link>
      </header>

      {/* CONFIRMATION CONTAINER */}
      <section className="google-confirm-container">
        <h1 className="google-confirm-title">Additional information</h1>

        {/* DYNAMIC CONFIRMATION MESSAGE BASED ON USER STATUS */}
        <p className="google-confirm-message">
          {userExists
            ? "An account with this email already exists, it will be linked to your Google account."
            : "A new account will be created with the email address you shared with us."}
        </p>

        {/* VERIFIED EMAIL DISPLAY & CONFIRM FORM */}
        <form className="google-confirm-form" onSubmit={handleNext}>
          <div className="google-confirm-field">
            <label htmlFor="google-confirmed-email">Enter an email address</label>

            <div className="google-confirm-input-wrap">
              <input
                id="google-confirmed-email"
                type="email"
                className="google-confirm-input"
                value={email || ""}
                readOnly
                disabled={loading}
                aria-readonly="true"
              />
              <span className="google-confirm-check-icon" title="Email verified by Google">
                <FiCheck strokeWidth={3} />
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="google-confirm-next-btn"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="google-confirm-btn-spinner" />
                <span>CONFIRMING...</span>
              </>
            ) : (
              <span>NEXT</span>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="google-confirm-footer">
          <span>Having trouble logging in ?</span>
          <Link to="/privacy">Privacy</Link>
        </div>

        {/* LANGUAGE */}
        <div className="google-confirm-language">
          <span className="google-confirm-india-flag" role="img" aria-label="India flag">
            🇮🇳
          </span>
          <span>English</span>
        </div>

        {/* RECAPTCHA NOTICE */}
        <p className="google-confirm-recaptcha">
          This site is protected by reCaptcha.{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>{" "}
          applies as well as their{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            terms of service
          </a>
        </p>
      </section>
    </main>
  );
};

export default GoogleConfirmation;
