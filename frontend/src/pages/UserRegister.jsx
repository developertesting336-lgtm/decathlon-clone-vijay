import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { IoHomeOutline } from "react-icons/io5";
import { MdCheckCircleOutline } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaApple } from "react-icons/fa";

import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/UserRegister.css";

const UserRegister = () => {
  const navigate = useNavigate();

  const [registerType, setRegisterType] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    const value = registerType === "email" ? email.trim() : phone.trim();

    console.log("NEXT CLICKED");
    console.log("Value:", value);

    if (!value) {
      toast.error(
        registerType === "email"
          ? "Email is required"
          : "Phone number is required",
      );
      return;
    }

    try {
      setLoading(true);

      const payload =
        registerType === "email"
          ? {
              type: "email",
              email: value,
            }
          : {
              type: "phone",
              phone: value,
            };

      console.log("Sending OTP:", payload);

      const response = await api.post("/registration/send-otp", payload);

      console.log("OTP RESPONSE:", response.data);

      toast.success(response.data.message || "OTP sent successfully");

      navigate("/verify-otp", {
        state: {
          mode: "register",
          type: registerType,
          email: registerType === "email" ? value : "",
          phone: registerType === "phone" ? value : "",
        },
      });
    } catch (error) {
      console.error("SEND OTP ERROR:", error);

      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="user-register-page">
      <header className="user-register-header">
        <button
          type="button"
          className="user-register-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          <IoHomeOutline />
          <span>Back</span>
        </button>

        <div className="user-register-logo">
          <span className="user-register-logo-mark">D</span>

          <span>DECATHLON</span>
        </div>
      </header>

      <section className="user-register-container">
        <h1 className="user-register-title">Let's go!</h1>

        <div className="user-register-tabs">
          <button
            type="button"
            className={registerType === "email" ? "active" : ""}
            onClick={() => setRegisterType("email")}
            disabled={loading}
          >
            E-mail
          </button>

          <button
            type="button"
            className={registerType === "phone" ? "active" : ""}
            onClick={() => setRegisterType("phone")}
            disabled={loading}
          >
            Phone number
          </button>
        </div>

        <div className="user-register-form">
          {registerType === "email" ? (
            <div className="user-register-field">
              <label>Enter an email address</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                disabled={loading}
              />
            </div>
          ) : (
            <div className="user-register-field">
              <label>Enter phone number</label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                disabled={loading}
              />
            </div>
          )}

          <button
            type="button"
            className="user-register-next"
            onClick={handleNext}
            disabled={loading}
          >
            NEXT
          </button>
        </div>

        <div className="user-register-social">
          <button type="button" className="register-social-btn">
            <FcGoogle className="register-google-icon" />
            <span>Continue with Google</span>
          </button>

          <button type="button" className="register-social-btn">
            <FaFacebook className="register-facebook-icon" />
            <span>Continue with Facebook</span>
          </button>

          <button type="button" className="register-social-btn">
            <FaApple className="register-apple-icon" />
            <span>Continue with Apple</span>
          </button>
        </div>

        <div className="user-register-login">
          <strong>Already have an account?</strong>

          <Link to="/login">Login</Link>
        </div>

        <div className="user-register-terms">
          <p>
            By creating an account, the customer agrees to the{" "}
            <a href="#terms">Terms and Conditions</a> and{" "}
            <a href="#privacy">Privacy policies for Consumers (B2C)</a>,{" "}
            <a href="#play-terms">Terms and Conditions</a> and{" "}
            <a href="#play-privacy">
              Privacy policies for Sport Practitioners (Play)
            </a>{" "}
            and <a href="#business-terms">Terms and Conditions</a> and{" "}
            <a href="#business-privacy">
              Privacy policies for Businesses (B2B)
            </a>
            , as applicable.
          </p>
        </div>

        <div className="user-register-benefits">
          <h3>It’s better when you’re signed in</h3>

          <div className="register-benefit-item">
            <MdCheckCircleOutline />
            <span>Exclusive Deals and Sporty Rewards</span>
          </div>

          <div className="register-benefit-item">
            <MdCheckCircleOutline />
            <span>Personalised Experiences</span>
          </div>

          <div className="register-benefit-item">
            <MdCheckCircleOutline />
            <span>Faster Checkout</span>
          </div>

          <div className="register-benefit-item">
            <MdCheckCircleOutline />
            <span>Easy Returns/Exchange</span>
          </div>
        </div>

        <div className="user-register-footer">
          <span>Having trouble logging in ?</span>

          <Link to="/privacy">Privacy</Link>
        </div>

        <div className="user-register-language">
          <span className="register-india-flag">🇮🇳</span>

          <span>English</span>
        </div>

        <p className="user-register-recaptcha">
          This site is protected by reCAPTCHA.
          <span> Google Privacy Policy </span>
          applies as well as their
          <span> Terms of Service.</span>
        </p>
      </section>
    </main>
  );
};

export default UserRegister;
