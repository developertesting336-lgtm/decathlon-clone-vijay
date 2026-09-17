import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { IoHomeOutline } from "react-icons/io5";
import { MdCheckCircleOutline } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaApple } from "react-icons/fa";

import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/UserLogin.css";

const UserLogin = () => {
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    const value =
      loginType === "email"
        ? email.trim()
        : phone.trim();

    if (!value) {
      toast.error(
        loginType === "email"
          ? "Email is required"
          : "Phone number is required",
      );

      return;
    }

    try {
      setLoading(true);

      const payload =
        loginType === "email"
          ? {
              type: "email",
              email: value,
            }
          : {
              type: "phone",
              phone: value,
            };

      console.log("Sending Login OTP:", payload);

      const response = await api.post(
        "/login/send-otp",
        payload,
      );

      console.log(
        "Login OTP Response:",
        response.data,
      );

      toast.success(
        response.data.message ||
          "OTP sent successfully",
      );

      navigate("/verify-otp", {
        state: {
          mode: "login",
          type: loginType,

          email:
            loginType === "email"
              ? value
              : "",

          phone:
            loginType === "phone"
              ? value
              : "",
        },
      });
    } catch (error) {
      console.error(
        "Login OTP Error:",
        error,
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to send login OTP",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="user-login-page">

      <header className="user-login-header">

        <button
          type="button"
          className="user-login-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          <IoHomeOutline />

          <span>
            Back
          </span>
        </button>

        <div className="user-login-logo">

          <span className="user-login-logo-mark">
            D
          </span>

          <span>
            DECATHLON
          </span>

        </div>

      </header>

      <section className="user-login-container">

        <h1 className="user-login-title">
          Login
        </h1>

        <div className="user-login-tabs">

          <button
            type="button"
            className={
              loginType === "email"
                ? "active"
                : ""
            }
            onClick={() =>
              setLoginType("email")
            }
            disabled={loading}
          >
            E-mail
          </button>

          <button
            type="button"
            className={
              loginType === "phone"
                ? "active"
                : ""
            }
            onClick={() =>
              setLoginType("phone")
            }
            disabled={loading}
          >
            Phone number
          </button>

        </div>

        <div className="user-login-form">

          {loginType === "email" ? (
            <div className="user-login-field">

              <label>
                Enter an email address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Email"
                disabled={loading}
              />

            </div>
          ) : (
            <div className="user-login-field">

              <label>
                Enter phone number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="Phone number"
                disabled={loading}
              />

            </div>
          )}

          <button
            type="button"
            className="user-login-next"
            onClick={handleNext}
            disabled={loading}
          >
            NEXT
          </button>

        </div>

        <div className="user-login-social">

          <button
            type="button"
            className="social-login-btn"
            disabled={loading}
          >
            <FcGoogle className="social-google-icon" />

            <span>
              Continue with Google
            </span>
          </button>

          <button
            type="button"
            className="social-login-btn"
            disabled={loading}
          >
            <FaFacebook className="social-facebook-icon" />

            <span>
              Continue with Facebook
            </span>
          </button>

          <button
            type="button"
            className="social-login-btn"
            disabled={loading}
          >
            <FaApple className="social-apple-icon" />

            <span>
              Continue with Apple
            </span>
          </button>

        </div>

        <div className="user-login-account">

          <strong>
            No account ? Create one !
          </strong>

          <Link to="/register">
            Create your DECATHLON account
          </Link>

        </div>

        <div className="user-login-benefits">

          <h3>
            It’s better when you’re signed in
          </h3>

          <div className="benefit-item">
            <MdCheckCircleOutline />

            <span>
              Exclusive Deals and Sporty Rewards
            </span>
          </div>

          <div className="benefit-item">
            <MdCheckCircleOutline />

            <span>
              Personalised Experiences
            </span>
          </div>

          <div className="benefit-item">
            <MdCheckCircleOutline />

            <span>
              Faster Checkout
            </span>
          </div>

          <div className="benefit-item">
            <MdCheckCircleOutline />

            <span>
              Easy Returns/Exchange
            </span>
          </div>

        </div>

        <div className="user-login-footer">

          <span>
            Having trouble logging in ?
          </span>

          <Link to="/privacy">
            Privacy
          </Link>

        </div>

        <div className="user-login-language">

          <span className="india-flag">
            🇮🇳
          </span>

          <span>
            English
          </span>

        </div>

        <p className="user-login-recaptcha">

          This site is protected by reCAPTCHA.

          <span>
            {" "}Google Privacy Policy{" "}
          </span>

          applies as well as their

          <span>
            {" "}Terms of Service.
          </span>

        </p>

      </section>

    </main>
  );
};

export default UserLogin;