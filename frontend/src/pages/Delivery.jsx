import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiMapPin,
  FiTag,
  FiAward,
  FiChevronRight,
  FiTruck,
  FiHome,
  FiChevronUp,
  FiCheck,
  FiShield,
} from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import DecathlonLogo from "../components/DecathlonLogo";
import AddressDrawer from "../components/AddressDrawer";
import ApplyCoupon from "../components/ApplyCoupon/ApplyCoupon";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { getGuestCart } from "../utils/guestCart";
import "../styles/Delivery.css";

const getProduct = (item) => item?.product || {};

const getQuantity = (item) => Number(item?.quantity || 1);

const getPrice = (item) => {
  const product = getProduct(item);

  return Number(product.discountPrice || product.price || 0);
};

const getMRP = (item) => Number(getProduct(item).price || 0);

const Delivery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const rewardEnabled = false;
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [billingSame, setBillingSame] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deliveryInfoOpen, setDeliveryInfoOpen] = useState(true);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    if (location.state?.appliedCoupon) {
      return location.state.appliedCoupon;
    }
    try {
      const saved = sessionStorage.getItem("applied_coupon");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (appliedCoupon) {
      sessionStorage.setItem("applied_coupon", JSON.stringify(appliedCoupon));
    } else {
      sessionStorage.removeItem("applied_coupon");
    }
  }, [appliedCoupon]);

  const rewardBalance = 0;

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  };

  const getImageUrl = (image) => {
    if (!image) return null;

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const guestItems = getGuestCart();
      setCartItems(Array.isArray(guestItems) ? guestItems : []);
      try {
        const savedGuestAddress = JSON.parse(
          localStorage.getItem("guest_address") || "null"
        );
        setSelectedAddress(savedGuestAddress);
      } catch {
        setSelectedAddress(null);
      }
      setLoading(false);
      return;
    }

    try {
      const [cartResponse, addressResponse] = await Promise.all([
        api.get("/cart", getAuthConfig()),
        api.get("/addresses", getAuthConfig()),
      ]);

      const items = cartResponse.data.cart?.items || [];
      const addresses = addressResponse.data.addresses || [];

      setCartItems(Array.isArray(items) ? items : []);

      if (Array.isArray(addresses) && addresses.length > 0) {
        const defaultAddress = addresses.find(
          (address) => address.isDefault === true,
        );
        setSelectedAddress(defaultAddress || addresses[0]);
      } else {
        setSelectedAddress(null);
      }
    } catch (error) {
      console.error("Delivery Data Error:", error);

      if (error.response?.status === 401) {
        const guestItems = getGuestCart();
        if (guestItems.length > 0) {
          setCartItems(guestItems);
          return;
        }
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      toast.error(
        error.response?.data?.message || "Failed to load delivery details",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalMRP = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + getMRP(item) * getQuantity(item),
      0,
    );
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + getPrice(item) * getQuantity(item),
      0,
    );
  }, [cartItems]);

  const discountOnMRP = totalMRP - totalAmount;

  const couponDiscount = appliedCoupon
    ? Number(appliedCoupon.discount || 0)
    : 0;

  const deliveryFee =
    deliveryMethod === "standard" ? (totalAmount >= 999 ? 0 : 49) : 0;

  const payableTotal = Math.max(0, totalAmount - couponDiscount + deliveryFee);

  const totalSaved = discountOnMRP + couponDiscount;

  // Revalidate coupon if cart total changes while on checkout
  const activeCouponCode = appliedCoupon?.couponCode;
  useEffect(() => {
    if (cartItems.length === 0 && activeCouponCode) {
      setAppliedCoupon(null);
      return;
    }

    if (activeCouponCode && totalAmount > 0) {
      let isCancelled = false;
      const revalidate = async () => {
        try {
          const response = await api.post("/coupons/validate", {
            code: activeCouponCode,
            cartTotal: totalAmount,
          });

          if (!isCancelled && response.data?.success) {
            const { coupon, discount, finalAmount: calculatedFinal } =
              response.data;
            setAppliedCoupon({
              couponCode: coupon?.code || activeCouponCode,
              discount: Number(discount || 0),
              finalAmount: Number(calculatedFinal || 0),
              discountType: coupon?.discountType || "flat",
              discountValue: Number(coupon?.discountValue || 0),
            });
          }
        } catch (err) {
          if (!isCancelled) {
            const reason =
              err.response?.data?.message || "Coupon criteria no longer met";
            toast.error(`Coupon removed: ${reason}`);
            setAppliedCoupon(null);
            sessionStorage.removeItem("applied_coupon");
          }
        }
      };

      revalidate();
      return () => {
        isCancelled = true;
      };
    }
  }, [totalAmount, cartItems.length, activeCouponCode]);

  const handleAddressChange = () => {
    setAddressDrawerOpen(true);
  };

  const handleAddressSaved = (address) => {
    setSelectedAddress(address);
    setAddressDrawerOpen(false);
  };

  const handleProceed = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast("Please login or register to complete your order", { icon: "🔒" });
      navigate("/login", { state: { from: "/checkout/cart/delivery" } });
      return;
    }

    if (!selectedAddress?._id) {
      toast.error("Please select a delivery address");
      setAddressDrawerOpen(true);
      return;
    }

    if (!deliveryMethod) {
      toast.error("Please select a delivery option");
      return;
    }

    if (!cartItems.length) {
      toast.error("Your cart is empty");
      navigate("/cart");
      return;
    }

    // Save checkout details for payment page - order will be created upon payment/COD selection
    const checkoutPayload = JSON.stringify({
      addressId: selectedAddress._id,
      selectedAddress,
      deliveryOption: deliveryMethod,
      couponCode: appliedCoupon?.couponCode || "",
      appliedCoupon,
    });
    sessionStorage.setItem("checkout_data", checkoutPayload);
    localStorage.setItem("pending_checkout_data", checkoutPayload);

    navigate("/payment");
  };

  if (loading) {
    return (
      <main className="delivery-page">
        <LoadingSpinner message="Loading delivery options..." minHeight="60vh" size="large" />
      </main>
    );
  }

  return (
    <>
      <main className="delivery-page">
        <header className="delivery-header">
          <div className="delivery-header-inner">
            <button
              type="button"
              className="delivery-back"
              onClick={() => navigate("/cart")}
            >
              <FiArrowLeft />
              <span>Back to Cart</span>
            </button>

            <Link to="/" className="delivery-logo" title="Decathlon">
              <DecathlonLogo height={24} />
            </Link>

            <div className="delivery-header-secure">
              <FiShield />
              <span>100% SECURE CHECKOUT</span>
            </div>
          </div>
        </header>

        <div className="delivery-steps-container">
          <div className="delivery-step completed">
            <span className="step-num">✓</span>
            <span className="step-label">Cart</span>
          </div>
          <div className="step-line active"></div>
          <div className="delivery-step active">
            <span className="step-num">2</span>
            <span className="step-label">Delivery</span>
          </div>
          <div className="step-line"></div>
          <div className="delivery-step">
            <span className="step-num">3</span>
            <span className="step-label">Payment</span>
          </div>
        </div>

        <div className="delivery-layout">
          <section className="delivery-left">
            <div className="delivery-title-row">
              <h1>Address & Delivery</h1>
              <span className="delivery-badge-sub">Step 2 of 3</span>
            </div>

            <div className="delivery-address">
              <div className="delivery-address-icon">
                <FiMapPin />
              </div>

              <div className="delivery-address-info">
                <div className="delivery-address-title">
                  <span>Deliver to: </span>
                  <strong>{selectedAddress?.addressType || "Home"}</strong>
                </div>

                <p>
                  {selectedAddress
                    ? `${selectedAddress.houseBuilding || ""}${selectedAddress.streetLocality ? `, ${selectedAddress.streetLocality}` : ""}${
                        selectedAddress.landmark
                          ? `, ${selectedAddress.landmark}`
                          : ""
                      }${selectedAddress.cityState ? `, ${selectedAddress.cityState}` : ""}${selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ""}`
                    : "No address selected"}
                </p>
              </div>

              <button type="button" className="delivery-change-btn" onClick={handleAddressChange}>
                Change
              </button>
            </div>

            <h2 className="delivery-section-title">Select Delivery Option</h2>

            <div className="delivery-options-group">
              <button
                type="button"
                className={
                  deliveryMethod === "standard"
                    ? "delivery-option selected"
                    : "delivery-option"
                }
                onClick={() => setDeliveryMethod("standard")}
                role="radio"
                aria-checked={deliveryMethod === "standard"}
              >
                <div className="delivery-option-icon">
                  <FiTruck />
                </div>

                <div className="delivery-option-info">
                  <div className="option-headline">
                    <strong>Standard Delivery</strong>
                    <span className="option-delivery-date">
                      Delivery by {new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  <p>Get your order delivered directly at your doorstep.</p>

                  <span className="delivery-available">
                    <span className="avail-dot" />
                    All items available
                  </span>
                </div>

                <div className="delivery-option-radio">
                  <span className="radio-circle">
                    {deliveryMethod === "standard" && <span className="radio-inner" />}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={deliveryMethod === "pickup" ? "delivery-option selected" : "delivery-option"}
                onClick={() => setDeliveryMethod("pickup")}
                aria-label="Pickup from Store"
                role="radio"
                aria-checked={deliveryMethod === "pickup"}
              >
                <div className="delivery-option-icon">
                  <FiHome />
                </div>

                <div className="delivery-option-info">
                  <div className="option-headline">
                    <strong>Pickup from Store</strong>
                    <span className="option-free-badge">FREE</span>
                  </div>

                  <p>
                    Collect your order from your favourite Decathlon store near you.
                  </p>

                  <span className="delivery-available">
                    <span className="avail-dot" />
                    Ready in 2 hours
                  </span>
                </div>

                <div className="delivery-option-radio">
                  <span className="radio-circle">
                    {deliveryMethod === "pickup" && <span className="radio-inner" />}
                  </span>
                </div>
              </button>
            </div>

            <div className="delivery-order-section">
              <div className="delivery-order-header">
                <h2>Items in this Order</h2>
                <span className="order-items-count">
                  {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="delivery-item-card">
                <div className="delivery-item-title">
                  <span>Estimated Arrival: </span>
                  <strong>{new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                </div>

                <div className="delivery-items-list">
                  {cartItems.map((item, index) => {
                    const product = getProduct(item);
                    const image = product?.images?.[0] || "";
                    const brand = (product?.brand || "DECATHLON").trim();
                    let displayName = (product?.name || "Product").trim();
                    if (displayName.toLowerCase().startsWith(brand.toLowerCase())) {
                      displayName = displayName.substring(brand.length).trim().replace(/^[-:\s]+/, "");
                    }

                    return (
                      <div
                        className="delivery-item-row"
                        key={product?._id || index}
                      >
                        <div className="delivery-item-image">
                          {image ? (
                            <img
                              src={getImageUrl(image)}
                              alt={product?.name || "Product"}
                            />
                          ) : (
                            <div>No Image</div>
                          )}
                        </div>

                        <div className="delivery-item-details">
                          <span className="delivery-item-brand">{brand}</span>
                          <span className="delivery-item-name">{displayName || product?.name}</span>

                          <div className="delivery-item-meta">
                            <span>Qty: {getQuantity(item)}</span>
                            {item?.size && <span>• Size: {item.size}</span>}
                          </div>
                        </div>

                        <div className="delivery-item-price">
                          <strong>
                            {formatPrice(getPrice(item) * getQuantity(item))}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="delivery-information">
                <button
                  type="button"
                  className="delivery-information-header"
                  onClick={() => setDeliveryInfoOpen((prev) => !prev)}
                >
                  <span>Delivery & Contact Details</span>
                  <FiChevronUp className={deliveryInfoOpen ? "open" : ""} />
                </button>

                {deliveryInfoOpen && (
                  <div className="delivery-information-content">
                    <div className="delivery-info-address">
                      <div className="delivery-info-text">
                        <strong>
                          {selectedAddress?.addressType || "Home"}
                        </strong>
                        <p>
                          {selectedAddress
                            ? `${selectedAddress.houseBuilding || ""}${selectedAddress.streetLocality ? `, ${selectedAddress.streetLocality}` : ""}${selectedAddress.cityState ? `, ${selectedAddress.cityState}` : ""}${selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ""}`
                            : "No address selected"}
                        </p>
                      </div>

                      <button type="button" className="info-change-btn" onClick={handleAddressChange}>
                        Change
                      </button>
                    </div>

                    {selectedAddress && (
                      <div className="delivery-contact">
                        <strong>Recipient: </strong>
                        <span>
                          {selectedAddress.firstName} {selectedAddress.lastName}
                        </span>
                        {selectedAddress.mobile && (
                          <span> • Tel: {selectedAddress.mobile}</span>
                        )}
                      </div>
                    )}

                    <div className="billing-address">
                      <label>
                        <input
                          type="checkbox"
                          checked={billingSame}
                          onChange={(e) => setBillingSame(e.target.checked)}
                        />
                        <span>Billing address is same as delivery address</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="delivery-right">
            <div className="delivery-sticky">
              {appliedCoupon ? (
                <div className="delivery-coupon-applied">
                  <div className="applied-coupon-left">
                    <div className="applied-coupon-icon">
                      <FiCheck />
                    </div>
                    <div className="applied-coupon-info">
                      <div className="applied-coupon-code">
                        <strong>{appliedCoupon.couponCode}</strong>
                        <span className="applied-badge">APPLIED</span>
                      </div>
                      <p className="applied-coupon-savings">
                        {formatPrice(appliedCoupon.discount)} coupon discount
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="remove-coupon-btn"
                    onClick={() => {
                      setAppliedCoupon(null);
                      sessionStorage.removeItem("applied_coupon");
                      toast.success("Coupon removed");
                    }}
                    title="Remove coupon"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="delivery-coupon"
                  onClick={() => setCouponModalOpen(true)}
                >
                  <div className="delivery-side-icon">
                    <FiTag />
                  </div>
                  <div className="delivery-coupon-content">
                    <span className="coupon-main-title">Apply Coupon</span>
                    <span className="coupon-sub-title">Save more with discount codes</span>
                  </div>
                  <FiChevronRight className="coupon-arrow" />
                </button>
              )}

              <div className="delivery-rewards">
                <div className="delivery-rewards-row">
                  <div className="delivery-side-icon">
                    <FiAward />
                  </div>

                  <div className="rewards-info-col">
                    <div className="rewards-heading-row">
                      <strong>Sporty Rewards</strong>
                      <span className="rewards-pts-badge">0 pts</span>
                    </div>
                    <small>Available Balance: ₹0</small>
                  </div>

                  <button
                    type="button"
                    disabled={true}
                    className="reward-toggle"
                    onClick={() => {
                      toast("You currently have 0 Sporty Reward points", { icon: "ℹ️" });
                    }}
                    title="Sporty Rewards (0 available)"
                  >
                    <span className="reward-toggle-thumb" />
                  </button>
                </div>
              </div>

              <div className="delivery-summary">
                <div className="summary-card-header">
                  <h2>Price Summary</h2>
                  <span className="summary-items-count">
                    {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="summary-row">
                  <span>Total MRP</span>
                  <strong>{formatPrice(totalMRP)}</strong>
                </div>

                {discountOnMRP > 0 && (
                  <div className="summary-row">
                    <span>Discount on MRP</span>
                    <strong className="summary-discount">
                      -{formatPrice(discountOnMRP)}
                    </strong>
                  </div>
                )}

                {appliedCoupon && couponDiscount > 0 && (
                  <div className="summary-row summary-coupon-row">
                    <span>Coupon Discount</span>
                    <strong className="summary-discount">
                      -{formatPrice(couponDiscount)}
                    </strong>
                  </div>
                )}

                <div className="summary-row">
                  <span>Convenience Fee</span>
                  <strong className={deliveryFee <= 0 ? "free-convenience" : ""}>
                    {deliveryFee > 0 ? (
                      formatPrice(deliveryFee)
                    ) : (
                      "FREE"
                    )}
                  </strong>
                </div>

                <div className="summary-divider" />

                <div className="summary-total">
                  <span>Total Payable</span>
                  <strong>{formatPrice(payableTotal)}</strong>
                </div>

                {totalSaved > 0 && (
                  <div className="summary-saved">
                    🎉 You saved <strong>{formatPrice(totalSaved)}</strong> on this order!
                  </div>
                )}

                <button
                  type="button"
                  className="proceed-btn"
                  onClick={handleProceed}
                >
                  PROCEED TO PAY
                </button>

                <div className="delivery-secure-notice">
                  <FiShield />
                  <span>Safe and Secure Payments • Easy Returns</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="delivery-footer">
          <Link to="/" className="delivery-footer-logo" title="Decathlon">
            <DecathlonLogo height={20} />
          </Link>

          <div className="delivery-footer-links">
            <a href="#terms">Terms of Use</a>
            <a href="#supply">Terms of Supply</a>
            <a href="#privacy">Privacy Policy</a>
          </div>

          <span className="delivery-footer-copy">© 2026 Decathlon. All rights reserved.</span>
        </footer>
      </main>

      <AddressDrawer
        isOpen={addressDrawerOpen}
        onClose={() => setAddressDrawerOpen(false)}
        selectedAddress={selectedAddress}
        onAddressSaved={handleAddressSaved}
      />

      <ApplyCoupon
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        cartTotal={totalAmount}
        appliedCoupon={appliedCoupon}
        onCouponApplied={(couponData) => {
          setAppliedCoupon(couponData);
        }}
        onRemoveCoupon={() => {
          setAppliedCoupon(null);
          sessionStorage.removeItem("applied_coupon");
          toast.success("Coupon removed");
        }}
      />
    </>
  );
};

export default Delivery;
