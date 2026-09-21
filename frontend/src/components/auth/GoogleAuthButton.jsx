import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useGoogleLogin, GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";

import api from "../../api/axios";
import "./GoogleAuthButton.css";

const GoogleAuthButton = ({
  text = "Continue with Google",
  redirectTo = "/",
  onSuccess,
  onError,
  className = "",
  showFallback = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [useOfficialGis, setUseOfficialGis] = useState(showFallback);

  const handleAuthPayload = async (tokenOrCredential) => {
    if (!tokenOrCredential) {
      toast.error("No token received from Google");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/login/google", {
        credential: tokenOrCredential,
        token: tokenOrCredential,
      });

      // CASE: Two-step confirmation required (Decathlon specification)
      if (response.data?.requiresConfirmation) {
        const confirmPayload = {
          email: response.data.email,
          userExists: Boolean(response.data.userExists),
          confirmationToken: response.data.confirmationToken,
          from: location.state?.from || redirectTo || "/",
        };

        try {
          sessionStorage.setItem(
            "decathlon_google_confirmation",
            JSON.stringify(confirmPayload)
          );
        } catch (e) {
          console.warn("Could not save to sessionStorage:", e);
        }

        navigate("/google-confirmation", {
          state: confirmPayload,
        });
        return;
      }

      const { token, user, message } = response.data || {};

      if (!token || !user) {
        throw new Error(
          "Authentication response incomplete: missing token or user data",
        );
      }

      // Store auth session
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Notify Navbar, Cart, and other active listeners
      window.dispatchEvent(new Event("authChanged"));
      window.dispatchEvent(new Event("cartUpdated"));

      toast.success(message || "Successfully logged in with Google!");

      if (typeof onSuccess === "function") {
        onSuccess(user);
      }

      const targetPath = location.state?.from || redirectTo || "/";
      navigate(targetPath);
    } catch (err) {
      console.error("Google Authentication Error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Google sign-in failed. Please try again.";
      toast.error(msg);

      if (typeof onError === "function") {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const token =
        tokenResponse?.access_token ||
        tokenResponse?.credential ||
        tokenResponse?.id_token;
      handleAuthPayload(token);
    },
    onError: (errorResponse) => {
      console.error("Google Sign-In Popup Error:", errorResponse);
      toast.error("Google sign-in was cancelled or failed");
      setUseOfficialGis(true);
      if (typeof onError === "function") {
        onError(errorResponse);
      }
    },
  });

  return (
    <div className={`google-auth-btn-wrapper ${className}`.trim()}>
      <button
        type="button"
        className="google-auth-btn social-login-btn"
        onClick={() => triggerGoogleLogin()}
        disabled={loading}
        title={text}
        aria-label={text}
      >
        {loading ? (
          <span className="google-auth-spinner" aria-hidden="true" />
        ) : (
          <FcGoogle className="google-auth-icon social-google-icon" />
        )}

        <span className="google-auth-text">
          {loading ? "Authenticating with Google..." : text}
        </span>
      </button>

      {useOfficialGis && (
        <div className="google-gis-fallback-wrapper">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              handleAuthPayload(credentialResponse.credential);
            }}
            onError={() => {
              toast.error("Official Google Identity login failed");
            }}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;
