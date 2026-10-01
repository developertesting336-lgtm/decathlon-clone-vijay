import React, { useEffect, useRef, useState } from "react";
import { FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "./ApplyCoupon.css";

// Rolling basket illustration matching the Decathlon empty state
const RollingBasketIcon = () => (
  <svg
    width="110"
    height="100"
    viewBox="0 0 110 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rolling-basket-svg"
  >
    {/* Floor shadow */}
    <ellipse cx="55" cy="88" rx="34" ry="4.5" fill="#e5e7eb" opacity="0.8" />

    {/* Sparkles around basket */}
    <path
      d="M26 48 L27.5 44 L29 48 L33 49.5 L29 51 L27.5 55 L26 51 L22 49.5 Z"
      fill="#a5b4fc"
    />
    <path
      d="M82 38 L83 35 L84 38 L87 39 L84 40 L83 43 L82 40 L79 39 Z"
      fill="#c7d2fe"
    />
    <path
      d="M38 28 L39 25.5 L40 28 L42.5 29 L40 30 L39 32.5 L38 30 L35.5 29 Z"
      fill="#cbd5e1"
    />
    <path
      d="M86 64 L87 62 L88 64 L90 65 L88 66 L87 68 L86 66 L84 65 Z"
      fill="#a5b4fc"
    />

    {/* Trolley Pull Handle */}
    <rect x="44" y="16" width="3" height="34" rx="1.5" fill="#94a3b8" />
    <rect x="63" y="16" width="3" height="34" rx="1.5" fill="#94a3b8" />
    <rect x="44" y="15" width="22" height="4" rx="2" fill="#64748b" />

    {/* Basket Main Body */}
    <path
      d="M40 46 L70 46 L66 80 L44 80 Z"
      fill="#818cf8"
    />

    {/* Basket Rim */}
    <rect x="38" y="44" width="34" height="5" rx="2.5" fill="#6366f1" />

    {/* Ribbed lines on basket body */}
    <line x1="47" y1="52" x2="48" y2="76" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    <line x1="53" y1="52" x2="53.5" y2="76" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    <line x1="59" y1="52" x2="58.5" y2="76" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    <line x1="65" y1="52" x2="64" y2="76" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />

    {/* Front Basket Accent Plate */}
    <rect x="48" y="58" width="14" height="10" rx="2" fill="#a5b4fc" opacity="0.6" />

    {/* Wheels */}
    <circle cx="45" cy="84" r="3.5" fill="#475569" />
    <circle cx="45" cy="84" r="1.5" fill="#cbd5e1" />
    <circle cx="65" cy="84" r="3.5" fill="#475569" />
    <circle cx="65" cy="84" r="1.5" fill="#cbd5e1" />
  </svg>
);

// Gift Box Icon matching the screenshot
const GiftBoxIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="gift-box-svg"
  >
    {/* Blue Box Base */}
    <rect x="4" y="10" width="20" height="15" rx="2" fill="#3b82f6" />
    {/* Orange Vertical Ribbon */}
    <rect x="12" y="10" width="4" height="15" fill="#f97316" />
    {/* Orange Horizontal Ribbon */}
    <rect x="4" y="16" width="20" height="3" fill="#f97316" />
    {/* Box Lid */}
    <rect x="3" y="9" width="22" height="3.5" rx="1.5" fill="#2563eb" />
    <rect x="12" y="9" width="4" height="3.5" fill="#ea580c" />
    {/* Bow on Top */}
    <path
      d="M10 6 C7 3, 11 1, 13 8 C15 1, 19 3, 16 6"
      stroke="#f97316"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ApplyCoupon = ({
  isOpen,
  onClose,
  cartTotal,
  appliedCoupon,
  onCouponApplied,
  onRemoveCoupon,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const inputRef = useRef(null);

  // Fetch available coupons whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setError("");
      setCouponCode("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const fetchCoupons = async () => {
        try {
          setFetchingAvailable(true);
          const res = await api.get("/coupons/available");
          if (res.data?.success && Array.isArray(res.data?.coupons)) {
            setAvailableCoupons(res.data.coupons);
          } else {
            setAvailableCoupons([]);
          }
        } catch {
          // If available endpoint fails or none exist, fall back to empty list
          setAvailableCoupons([]);
        } finally {
          setFetchingAvailable(false);
        }
      };

      fetchCoupons();
    } else {
      document.body.style.overflow = "";
      setError("");
      setCouponCode("");
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setCouponCode(e.target.value.toUpperCase());
    if (error) setError("");
  };

  const applyCode = async (codeToApply) => {
    const trimmedCode = (codeToApply || "").trim().toUpperCase();

    if (!trimmedCode) {
      setError("Coupon code is required");
      return;
    }

    if (appliedCoupon) {
      setError(
        `Coupon "${appliedCoupon.couponCode}" is already applied. Please remove it first to apply another coupon.`
      );
      return;
    }

    if (!cartTotal || Number(cartTotal) <= 0) {
      setError("Invalid cart total");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/coupons/validate", {
        code: trimmedCode,
        cartTotal: Number(cartTotal),
      });

      if (response.data?.success) {
        const { coupon, discount, finalAmount } = response.data;

        onCouponApplied({
          couponCode: coupon?.code || trimmedCode,
          discount: Number(discount || 0),
          finalAmount: Number(finalAmount || 0),
          discountType: coupon?.discountType || "flat",
          discountValue: Number(coupon?.discountValue || 0),
        });

        toast.success(
          `Coupon "${coupon?.code || trimmedCode}" applied! Saved ₹${Number(
            discount || 0
          ).toLocaleString("en-IN")}`
        );

        onClose();
      } else {
        setError(response.data?.message || "Failed to apply coupon");
      }
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? "Invalid coupon code"
          : "Failed to validate coupon. Please try again.");
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    applyCode(couponCode);
  };

  return (
    <div
      className="apply-coupon-overlay"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="apply-coupon-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-coupon-heading"
      >
        {/* MODAL HEADER */}
        <header className="apply-coupon-header">
          <h2 id="apply-coupon-heading">Apply Coupon</h2>
          <button
            type="button"
            className="apply-coupon-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close coupon modal"
          >
            <FiX />
          </button>
        </header>

        <div className="apply-coupon-body">
          {/* APPLIED COUPON NOTICE (IF ACTIVE) */}
          {appliedCoupon && (
            <div className="apply-coupon-active-banner">
              <div className="active-banner-left">
                <div className="active-banner-check">
                  <FiCheck />
                </div>
                <div>
                  <strong>{appliedCoupon.couponCode}</strong>
                  <span>
                    ₹{Number(appliedCoupon.discount || 0).toLocaleString("en-IN")}{" "}
                    discount applied
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="active-banner-remove-btn"
                onClick={() => {
                  onRemoveCoupon();
                  setError("");
                }}
              >
                Remove
              </button>
            </div>
          )}

          {/* INPUT FORM WITH EMBEDDED APPLY BUTTON */}
          <form onSubmit={handleSubmit} className="apply-coupon-form">
            <div className={`apply-coupon-input-wrap ${error ? "has-error" : ""}`}>
              <input
                ref={inputRef}
                type="text"
                className="apply-coupon-input"
                placeholder="Have a coupon code? Type here"
                value={couponCode}
                onChange={handleInputChange}
                disabled={loading}
                maxLength={30}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="apply-coupon-action-btn"
                disabled={loading || !couponCode.trim()}
              >
                {loading ? "Applying..." : "Apply"}
              </button>
            </div>

            {error && (
              <div className="apply-coupon-error-banner" role="alert">
                <FiAlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* DISCLAIMER / SPORTY REWARDS NOTE */}
          <div className="apply-coupon-notice-box">
            <p>
              Either <strong>Sporty Rewards</strong> or a{" "}
              <strong>Coupon</strong> is applicable at a time. By applying the
              voucher code you agree to our{" "}
              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  toast("Coupons & Rewards terms apply per Decathlon policy.");
                }}
              >
                Terms & Conditions
              </a>
              .
            </p>
          </div>

          {/* ALL COUPONS SECTION HEADER */}
          <div className="all-coupons-header">
            <h3>All Coupons ({availableCoupons.length})</h3>
            <GiftBoxIcon />
          </div>

          {/* COUPONS LIST OR EMPTY STATE */}
          {fetchingAvailable ? (
            <div className="coupons-loading">
              <span>Checking available coupons...</span>
            </div>
          ) : availableCoupons.length > 0 ? (
            <div className="available-coupons-list">
              {availableCoupons.map((coupon) => (
                <div key={coupon._id || coupon.code} className="coupon-item-card">
                  <div className="coupon-item-left">
                    <span className="coupon-item-code">{coupon.code}</span>
                    <p className="coupon-item-desc">
                      {coupon.discountType === "percentage"
                        ? `Get ${coupon.discountValue}% OFF${
                            coupon.maximumDiscount
                              ? ` up to ₹${coupon.maximumDiscount}`
                              : ""
                          }`
                        : `Flat ₹${coupon.discountValue} OFF`}
                    </p>
                    {coupon.minimumOrderValue > 0 && (
                      <span className="coupon-item-min">
                        Min. order ₹
                        {Number(coupon.minimumOrderValue).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="coupon-item-apply-btn"
                    disabled={loading || appliedCoupon}
                    onClick={() => {
                      setCouponCode(coupon.code);
                      applyCode(coupon.code);
                    }}
                  >
                    APPLY
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-coupons-empty-state">
              <RollingBasketIcon />
              <h4>No Coupons Available</h4>
              <p>
                There are currently no coupons available for your cart. Check back
                later for new offers!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyCoupon;

