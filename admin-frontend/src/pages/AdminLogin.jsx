import React, { useState } from "react";
import api from "../api/axios";
import "../styles/AdminLogin.css";

import sports1 from "../assets/images/login/sports1.png";
import sports2 from "../assets/images/login/sports2.png";
import sports3 from "../assets/images/login/sports3.png";
import sports4 from "../assets/images/login/sports4.png";
import sports5 from "../assets/images/login/sports5.png";
import sports6 from "../assets/images/login/sports6.png";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      if (user.role !== "admin") {
        setError("You are not authorized as an admin");
        return;
      }

      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminUser", JSON.stringify(user));

      console.log("Admin Login Successful:", user);

      window.location.href = "/dashboard";
    } catch (error) {
      setError(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">

      {/* LEFT SECTION */}
      <div className="admin-login-left">

        <div className="left-images">
          <img src={sports1} alt="Sport" />
          <img src={sports2} alt="Sport" />
          <img src={sports3} alt="Sport" />
          <img src={sports4} alt="Sport" />
          <img src={sports5} alt="Sport" />
          <img src={sports6} alt="Sport" />
        </div>

        <div className="left-text">
          Bring people{" "}
          <strong>together</strong> through{" "}
          <strong>sport</strong> to make wellbeing{" "}
          <strong>accessible for all</strong>
        </div>

      </div>

      {/* RIGHT SECTION */}
      <div className="admin-login-right">

        <div className="login-container">

          <div className="admin-logo">
            <h2>DECATHLON</h2>
          </div>

          <h1>Hello teammate!</h1>

          <form onSubmit={handleLogin}>

            <label>Username</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign On"}
            </button>

          </form>

          <div className="login-links">
            <span>Change my password</span>
            <span>|</span>
            <span>Forgotten password ?</span>
          </div>

          <div className="language">
            language⌄
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminLogin;