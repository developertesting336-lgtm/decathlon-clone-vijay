import React, { useState, useEffect, useCallback, useRef } from "react";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import api, { isTokenExpired } from "../../api/axios";
import "./NotifyMe.css";

const NotifyMe = ({
  productId,
  product,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const inputRef = useRef(null);

  // Check if user is currently authenticated
  const checkIsAuthenticated = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    return !isTokenExpired(token);
  }, []);

  // Check subscription status on mount or when productId changes
  useEffect(() => {
    if (!productId) return;

    let isMounted = true;
    const isAuth = checkIsAuthenticated();

    // Check session storage first for guests
    const guestStored = sessionStorage.getItem(`stock_notif_${productId}`);
    if (guestStored) {
      setEmailInput(guestStored);
      setIsSubscribed(true);
    }

    // If authenticated, check backend subscription status
    if (isAuth) {
      const fetchMySubscriptions = async () => {
        try {
          setLoadingCheck(true);
          const response = await api.get("/stock-notifications/my");
          if (!isMounted) return;

          const notifications = response.data?.notifications || [];
          const found = notifications.some((sub) => {
            if (sub.notified) return false;
            const subProdId = sub.product?._id || sub.product;
            return String(subProdId) === String(productId);
          });

          if (found) {
            setIsSubscribed(true);
          }
        } catch (err) {
          // If 401 or token expired, silently ignore background check
          if (err.response?.status !== 401) {
            console.error("Fetch Stock Notifications Error:", err);
          }
        } finally {
          if (isMounted) {
            setLoadingCheck(false);
          }
        }
      };

      fetchMySubscriptions();
    }

    return () => {
      isMounted = false;
    };
  }, [productId, checkIsAuthenticated]);

  // Focus input when modal opens & handle ESC key
  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setEmailError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [showModal]);

  // Helper to extract email from localStorage user if available
  const getLoggedInUserEmail = () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) return parsed.email.trim();
      }
    } catch {
      // Ignore JSON parse error
    }
    return "";
  };

  // Click handler for the main "Notify Me When Available" button
  const handleNotifyClick = async () => {
    if (loadingAction || isSubscribed) return;

    const isAuth = checkIsAuthenticated();

    // If not authenticated, open email modal for guest flow
    if (!isAuth) {
      setEmailError("");
      setShowModal(true);
      return;
    }

    // Authenticated user flow
    const userEmail = getLoggedInUserEmail();

    try {
      setLoadingAction(true);
      const payload = {
        productId,
        ...(userEmail ? { email: userEmail } : {}),
      };

      const response = await api.post("/stock-notifications", payload);

      if (response.data?.alreadySubscribed) {
        toast("You're already subscribed for this product.");
      } else {
        toast.success(
          response.data?.message || "You'll be notified when this product is back in stock."
        );
      }
      setIsSubscribed(true);
    } catch (err) {
      console.error("Stock Notification Subscribe Error:", err);

      const status = err.response?.status;
      const msg = err.response?.data?.message || "";

      // If email is missing for OTP-logged in user, prompt modal
      if (status === 400 && msg.toLowerCase().includes("email address is required")) {
        setShowModal(true);
        return;
      }

      if (msg.toLowerCase().includes("already subscribed")) {
        toast("You're already subscribed for this product.");
        setIsSubscribed(true);
      } else if (msg.toLowerCase().includes("in stock")) {
        toast.error("This product is currently in stock.");
      } else {
        toast.error(msg || "Unable to enable notification. Please try again.");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Guest modal submission handler
  const handleModalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loadingAction) return;

    const cleanEmail = emailInput.trim();

    if (!cleanEmail) {
      setEmailError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    try {
      setLoadingAction(true);
      setEmailError("");

      const response = await api.post("/stock-notifications", {
        productId,
        email: cleanEmail,
      });

      if (response.data?.alreadySubscribed) {
        toast("You're already subscribed for this product.");
      } else {
        toast.success(
          response.data?.message || "You'll be notified when this product is back in stock."
        );
      }

      setIsSubscribed(true);
      sessionStorage.setItem(`stock_notif_${productId}`, cleanEmail);
      setShowModal(false);
    } catch (err) {
      console.error("Guest Stock Notification Error:", err);
      const msg = err.response?.data?.message || "";

      if (msg.toLowerCase().includes("already subscribed")) {
        toast("You're already subscribed for this product.");
        setIsSubscribed(true);
        setShowModal(false);
      } else if (msg.toLowerCase().includes("invalid email")) {
        setEmailError("Please enter a valid email address.");
      } else {
        setEmailError(msg || "Unable to enable notification. Please try again.");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Unsubscribe handler
  const handleUnsubscribe = async () => {
    if (loadingAction) return;

    const isAuth = checkIsAuthenticated();
    const storedGuestEmail = emailInput || sessionStorage.getItem(`stock_notif_${productId}`);

    try {
      setLoadingAction(true);

      let url = `/stock-notifications/${productId}`;
      const config = {};

      if (!isAuth && storedGuestEmail) {
        url += `?email=${encodeURIComponent(storedGuestEmail)}`;
        config.data = { email: storedGuestEmail };
      }

      await api.delete(url, config);

      toast.success("Notification removed.");
      setIsSubscribed(false);
      sessionStorage.removeItem(`stock_notif_${productId}`);
    } catch (err) {
      console.error("Unsubscribe Error:", err);
      toast.error(err.response?.data?.message || "Failed to remove notification. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="notify-me-wrapper">
      {/* Out of Stock Notice Banner */}
      <div className="notify-me-banner" role="status">
        <div className="notify-me-banner-header">
          <span className="notify-me-oos-pill">Out of Stock</span>
          <span className="notify-me-banner-title">Product is currently out of stock</span>
        </div>
        <p className="notify-me-banner-subtitle">
          {isSubscribed
            ? "We'll send you an email alert as soon as this gear arrives in our warehouse."
            : "Sign up to receive an instant alert when this product becomes available again."}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="pdp-actions-row notify-me-actions-row">
        {/* Wishlist Button */}
        {typeof onToggleWishlist === "function" && (
          <button
            type="button"
            className={`pdp-heart-btn ${isWishlisted ? "active" : ""}`}
            onClick={onToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            {isWishlisted ? <MdFavorite /> : <MdFavoriteBorder />}
          </button>
        )}

        {/* Dynamic Notify Me / Subscribed CTA */}
        {isSubscribed ? (
          <div className="notify-me-subscribed-container">
            <button
              type="button"
              className="notify-me-btn subscribed-btn"
              disabled
              aria-label="Notification enabled"
            >
              <FiCheck className="notify-me-icon check" /> ✓ We'll notify you
            </button>
            <button
              type="button"
              className="notify-me-remove-btn"
              onClick={handleUnsubscribe}
              disabled={loadingAction}
              aria-label="Remove stock notification"
            >
              {loadingAction ? "Removing..." : "Remove notification"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="notify-me-btn available-btn"
            onClick={handleNotifyClick}
            disabled={loadingAction || loadingCheck}
            aria-label="Notify me when available"
          >
            <FiBell className="notify-me-icon bell" />
            {loadingAction || loadingCheck ? "Please wait..." : "Notify Me When Available"}
          </button>
        )}
      </div>

      {/* Guest Email Modal */}
      {showModal && (
        <div
          className="notify-modal-overlay"
          onClick={() => {
            setShowModal(false);
            setEmailError("");
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notify-modal-heading"
        >
          <div
            className="notify-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notify-modal-header">
              <h3 id="notify-modal-heading">Get notified when available</h3>
              <button
                type="button"
                className="notify-modal-close-btn"
                onClick={() => {
                  setShowModal(false);
                  setEmailError("");
                }}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="notify-modal-body">
              <p className="notify-modal-desc">
                Leave your email and we'll alert you the moment{" "}
                <strong>{product?.name || "this item"}</strong> is back in stock.
              </p>

              <div className="notify-form-group">
                <label htmlFor="notify-email-input">Email address</label>
                <input
                  id="notify-email-input"
                  ref={inputRef}
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={emailError ? "has-error" : ""}
                  disabled={loadingAction}
                  autoComplete="email"
                  required
                />
                {emailError && <span className="notify-error-text">{emailError}</span>}
              </div>

              <div className="notify-modal-actions">
                <button
                  type="button"
                  className="notify-modal-btn cancel"
                  onClick={() => {
                    setShowModal(false);
                    setEmailError("");
                  }}
                  disabled={loadingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="notify-modal-btn submit"
                  disabled={loadingAction}
                >
                  {loadingAction ? "Please wait..." : "Notify Me"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotifyMe;
