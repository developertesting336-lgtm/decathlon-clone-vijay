import React, { useEffect, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { IoHomeOutline } from "react-icons/io5";
import { MdInfoOutline } from "react-icons/md";

import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/UserVerifyOTP.css";

const UserVerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode || "register";

  const type = location.state?.type || "email";

  const email = location.state?.email || "";

  const phone = location.state?.phone || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const [countdown, setCountdown] = useState(5);

  const [showSuccess, setShowSuccess] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setShowSuccess(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];

    newOtp[index] = digit;

    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const pastedValue = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedValue) {
      return;
    }

    const newOtp = ["", "", "", "", "", ""];

    pastedValue.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    inputRefs.current[Math.min(pastedValue.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    const code = otp.join("");

    if (code.length !== 6) {
      toast.error("Enter 6-digit OTP");

      return;
    }

    try {
      setLoading(true);

      const payload =
        type === "email"
          ? {
              type: "email",
              email,
              otp: code,
            }
          : {
              type: "phone",
              phone,
              otp: code,
            };

      const endpoint =
        mode === "register" ? "/registration/verify-otp" : "/login/verify-otp";

      const response = await api.post(endpoint, payload);

      const token = response.data.token;

      const user = response.data.user;

      if (!token || !user) {
        toast.error("Authentication data not received");

        return;
      }

      localStorage.setItem("token", token);

      localStorage.setItem("user", JSON.stringify(user));

      window.dispatchEvent(new Event("authChanged"));

      toast.success(response.data.message || "Success");

      navigate("/");
    } catch (error) {
      console.error("OTP Verification Error:", error);

      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);

      const payload =
        type === "email"
          ? {
              type: "email",
              email,
            }
          : {
              type: "phone",
              phone,
            };

      const endpoint =
        mode === "register" ? "/registration/resend-otp" : "/login/resend-otp";

      const response = await api.post(endpoint, payload);

      setOtp(["", "", "", "", "", ""]);

      setCountdown(5);
      setShowSuccess(false);

      inputRefs.current[0]?.focus();

      toast.success(response.data.message || "OTP resent successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleEdit = () => {
    navigate(mode === "register" ? "/register" : "/login");
  };

  const displayValue = type === "email" ? email : phone;

  const isComplete = otp.join("").length === 6;

  return (
    <main className="verify-otp-page">
      <header className="verify-otp-header">
        <button
          type="button"
          className="verify-otp-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          <IoHomeOutline />

          <span>Back</span>
        </button>

        <div className="verify-otp-logo">
          <span className="verify-otp-logo-mark">D</span>

          <span>DECATHLON</span>
        </div>
      </header>

      <section className="verify-otp-container">
        <h1 className="verify-otp-title">Enter the code you received:</h1>

        <div className="verify-otp-description">
          <p>
            Enter the 6-digit verification code sent by{" "}
            {type === "email" ? "email" : "phone"} to:
          </p>

          <div className="verify-otp-email-row">
            <span>{displayValue}</span>

            <button type="button" onClick={handleEdit} disabled={loading}>
              Edit
            </button>
          </div>
        </div>

        <div className="verify-otp-info">
          <MdInfoOutline />

          <span>
            {showSuccess
              ? "The code has been sent"
              : `The code will be sent in ${countdown} seconds`}
          </span>
        </div>

        <form className="verify-otp-form" onSubmit={handleVerify}>
          <div className="verify-otp-inputs" onPaste={handlePaste}>
            {otp.map((value, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value}
                disabled={loading}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          <button
            type="submit"
            className={`verify-otp-next ${isComplete ? "enabled" : ""}`}
            disabled={loading || !isComplete}
          >
            {loading ? "VERIFYING..." : "NEXT"}
          </button>
        </form>

        {showSuccess && (
          <div className="verify-otp-resend">
            <span>Didn't receive the code?</span>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
            >
              {resending ? "Resending..." : "Resend OTP"}
            </button>
          </div>
        )}

        <div className="verify-otp-footer">
          <span>Having trouble logging in ?</span>

          <a href="/privacy">Privacy</a>
        </div>

        <div className="verify-otp-language">
          <span>🇮🇳</span>

          <span>English</span>
        </div>

        <p className="verify-otp-recaptcha">
          This site is protected by reCAPTCHA.
          <span> Google Privacy Policy </span>
          applies as well as their
          <span> Terms of Service.</span>
        </p>
      </section>
    </main>
  );
};

export default UserVerifyOTP;
