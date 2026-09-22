import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "./App.css";

import Navbar from "./components/Navbar";
import CategoryNav from "./components/pageSections/CategoryNav/CategoryNav";

import Home from "./pages/Home";
import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import UserVerifyOTP from "./pages/UserVerifyOTP";
import GoogleConfirmation from "./pages/GoogleConfirmation";
import Cart from "./pages/Cart";
import Delivery from "./pages/Delivery";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import Profile from "./pages/Profile";
import MyAccount from "./pages/MyAccount";
import Wishlist from "./pages/Wishlist";
import ProductDetail from "./pages/ProductDetail";
import CategoryRoutes from "./routes/categoryRoutes";
import ScrollToTop from "./components/ScrollToTop";
import AiChatbot from "./components/chat/AiChatbot";
import SectionPreview from "./pages/SectionPreview";
import {
  isTokenExpired,
  getTokenRemainingTime,
  handleAutoLogout,
} from "./api/axios";

const GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  "902081087966-cvuu00ce433nf87gfrp17f9sbial3nfv.apps.googleusercontent.com";

function App() {
  useEffect(() => {
    let logoutTimer = null;

    const checkAndScheduleLogout = () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
      }

      const token = localStorage.getItem("token");
      if (!token) return;

      if (isTokenExpired(token)) {
        handleAutoLogout("Session expired. Please login again.");
        return;
      }

      const remainingMs = getTokenRemainingTime(token);
      if (remainingMs <= 0) {
        handleAutoLogout("Session expired. Please login again.");
        return;
      }

      logoutTimer = setTimeout(() => {
        handleAutoLogout("Session expired. Please login again.");
      }, remainingMs);
    };

    checkAndScheduleLogout();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkAndScheduleLogout();
      }
    };

    const handleAuthEvent = () => {
      checkAndScheduleLogout();
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("authChanged", handleAuthEvent);
    window.addEventListener("storage", handleAuthEvent);

    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
      }
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("authChanged", handleAuthEvent);
      window.removeEventListener("storage", handleAuthEvent);
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ScrollToTop />
        <div className="App">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <CategoryNav />
                  <Home />
                </>
              }
            />
            <Route
              path="/home"
              element={
                <>
                  <Navbar />
                  <CategoryNav />
                  <Home />
                </>
              }
            />

            {CategoryRoutes}

            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            <Route path="/login" element={<UserLogin />} />

            <Route path="/register" element={<UserRegister />} />

            <Route path="/verify-otp" element={<UserVerifyOTP />} />

            <Route path="/google-confirmation" element={<GoogleConfirmation />} />

            <Route path="/cart" element={<Cart />} />

            <Route path="/wishlist" element={<Wishlist />} />

            <Route path="/checkout/cart/delivery" element={<Delivery />} />

            <Route path="/payment/:orderId" element={<Payment />} />

            <Route path="/order-success/:orderId" element={<OrderSuccess />} />

            <Route path="/profile" element={<Profile />} />

            <Route path="/account" element={<MyAccount />} />

            <Route path="/account/orders-returns" element={<MyAccount />} />

            {/* Standalone Section Preview Route */}
            <Route path="/preview/section" element={<SectionPreview />} />
            <Route path="/preview/section/:pageId/:sectionId" element={<SectionPreview />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <AiChatbot />

        <Toaster
          position="top-right"
          containerStyle={{
            zIndex: 9999999,
          }}
          toastOptions={{
            duration: 2000,
            style: {
              zIndex: 9999999,
            },
          }}
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
