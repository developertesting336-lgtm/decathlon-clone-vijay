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
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import AddressDrawer from "../components/AddressDrawer";
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

  const [cartItems, setCartItems] = useState([]);

  const [selectedAddress, setSelectedAddress] = useState(null);

  const [rewardEnabled, setRewardEnabled] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState("standard");

  const [billingSame, setBillingSame] = useState(true);

  const [loading, setLoading] = useState(true);

  const [creatingOrder, setCreatingOrder] = useState(false);

  const [deliveryInfoOpen, setDeliveryInfoOpen] = useState(true);

  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);

  const rewardBalance = 0;
  const convenienceFee = 49;

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
    if (!image) return "";

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

  const discount = totalMRP - totalAmount;

  const total = totalAmount + convenienceFee;

  const handleAddressChange = () => {
    setAddressDrawerOpen(true);
  };

  const handleAddressSaved = (address) => {
    setSelectedAddress(address);
    setAddressDrawerOpen(false);
  };

  const handleProceed = async () => {
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

    try {
      setCreatingOrder(true);

      const response = await api.post(
        "/orders",
        {
          addressId: selectedAddress._id,
          paymentMethod: "UPI",
          deliveryOption: deliveryMethod,
        },
        getAuthConfig(),
      );

      const order = response.data?.order;

      if (!order?._id) {
        toast.error("Order ID not received");
        return;
      }

      toast.success("Order created successfully");

      navigate(`/payment/${order._id}`);
    } catch (error) {
      console.error("Create Order Error:", error);

      if (error.response?.status === 401) {
        toast.error("Please login first");

        navigate("/login");
        return;
      }

      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return <div className="delivery-loading">Loading...</div>;
  }

  return (
    <>
      <main className="delivery-page">
        <header className="delivery-header">
          <button
            type="button"
            className="delivery-back"
            onClick={() => navigate("/cart")}
          >
            <FiArrowLeft />
            <span>Back to Cart</span>
          </button>

          <Link to="/" className="delivery-logo">
            <span>D</span>
            <strong>DECATHLON</strong>
          </Link>

          <div />
        </header>

        <div className="delivery-progress">
          <span className="active" />
          <span className="active" />
          <span />
        </div>

        <div className="delivery-layout">
          <section className="delivery-left">
            <h1>Address/Delivery</h1>

            <div className="delivery-address">
              <div className="delivery-address-icon">
                <FiMapPin />
              </div>

              <div className="delivery-address-info">
                <div className="delivery-address-title">
                  Delivery to{" "}
                  <strong>{selectedAddress?.addressType || "Home"}</strong>
                </div>

                <p>
                  {selectedAddress
                    ? `${selectedAddress.houseBuilding}, ${selectedAddress.streetLocality}, ${
                        selectedAddress.landmark
                          ? `${selectedAddress.landmark}, `
                          : ""
                      }${selectedAddress.cityState}, ${selectedAddress.pincode}`
                    : "No address selected"}
                </p>
              </div>

              <button type="button" onClick={handleAddressChange}>
                Change
              </button>
            </div>

            <h2 className="delivery-section-title">Select Delivery Option</h2>

            <button
              type="button"
              className={
                deliveryMethod === "standard"
                  ? "delivery-option selected"
                  : "delivery-option"
              }
              onClick={() => setDeliveryMethod("standard")}
            >
              <div className="delivery-option-icon">
                <FiTruck />
              </div>

              <div className="delivery-option-info">
                <strong>Standard Delivery</strong>

                <b>Delivery by 2nd September</b>

                <p>Get your order delivered at your door step.</p>

                <span className="delivery-available">
                  <i />
                  All item available
                </span>
              </div>

              <span className="delivery-option-check">✓</span>
            </button>

            <button
              type="button"
              className="delivery-option unavailable"
              disabled
            >
              <div className="delivery-option-icon">
                <FiHome />
              </div>

              <div className="delivery-option-info">
                <strong>Pickup from Store</strong>

                <p>
                  Collect your order from your favourite Decathlon store near
                  you.
                </p>

                <span className="delivery-unavailable">
                  <i />
                  Unavailable
                </span>
              </div>

              <span className="delivery-option-check disabled">✓</span>
            </button>

            <div className="delivery-order-section">
              <h2>Order Summary</h2>

              <p>Delivery at your door step</p>

              <div className="delivery-item-card">
                <div className="delivery-item-title">
                  {cartItems.length} Item
                  {cartItems.length !== 1 ? "s" : ""} - Delivery by{" "}
                  <strong>02nd Sep 2026</strong>
                </div>

                <div className="delivery-items-list">
                  {cartItems.map((item, index) => {
                    const product = getProduct(item);

                    const image = product?.images?.[0] || "";

                    return (
                      <div
                        className="delivery-item-row"
                        key={product?._id || index}
                      >
                        <div className="delivery-item-image">
                          {image && (
                            <img
                              src={getImageUrl(image)}
                              alt={product?.name || "Product"}
                            />
                          )}
                        </div>

                        <div className="delivery-item-details">
                          <strong>{product?.brand || "DECATHLON"}</strong>

                          <span>{product?.name}</span>

                          <small>
                            Qty: {getQuantity(item)}
                            {item?.size ? ` • Size: ${item.size}` : ""}
                          </small>
                        </div>

                        <strong>
                          {formatPrice(getPrice(item) * getQuantity(item))}
                        </strong>
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
                  <span>Delivery Information</span>

                  <FiChevronUp className={deliveryInfoOpen ? "open" : ""} />
                </button>

                {deliveryInfoOpen && (
                  <div className="delivery-information-content">
                    <div className="delivery-info-address">
                      <div>
                        <strong>
                          {selectedAddress?.addressType || "Home"}
                        </strong>{" "}
                        -{" "}
                        {selectedAddress
                          ? `${selectedAddress.houseBuilding}, ${selectedAddress.streetLocality}, ${selectedAddress.cityState}, ${selectedAddress.pincode}`
                          : "No address selected"}
                      </div>

                      <button type="button" onClick={handleAddressChange}>
                        Change
                      </button>
                    </div>

                    <div className="delivery-contact">
                      <strong>
                        {selectedAddress?.firstName} {selectedAddress?.lastName}
                      </strong>

                      {selectedAddress?.mobile && (
                        <span>, {selectedAddress.mobile}</span>
                      )}
                    </div>

                    <div className="billing-address">
                      <label>
                        <input
                          type="checkbox"
                          checked={billingSame}
                          onChange={(e) => setBillingSame(e.target.checked)}
                        />

                        <span>Billing address same as delivery</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="delivery-footer">
              <Link to="/" className="delivery-footer-logo">
                <span>D</span>
                <strong>DECATHLON</strong>
              </Link>

              <div className="delivery-footer-links">
                <a href="#terms">
                  Terms of use
                  <FiChevronRight />
                </a>

                <a href="#supply">
                  Terms of supply
                  <FiChevronRight />
                </a>

                <a href="#privacy">
                  Privacy policy
                  <FiChevronRight />
                </a>
              </div>

              <span className="delivery-footer-copy">©2026 Decathlon</span>
            </footer>
          </section>

          <aside className="delivery-right">
            <div className="delivery-sticky">
              <button
                type="button"
                className="delivery-coupon"
                onClick={() => toast.info("Coupon selection coming soon")}
              >
                <div className="delivery-side-icon">
                  <FiTag />
                </div>

                <span>Apply Coupon</span>

                <FiChevronRight />
              </button>

              <div className="delivery-rewards">
                <div className="delivery-rewards-row">
                  <div className="delivery-side-icon">
                    <FiAward />
                  </div>

                  <div>
                    <strong>Sporty Rewards: ₹{rewardBalance}</strong>

                    <small>Available Balance: ₹{rewardBalance}</small>
                  </div>

                  <button
                    type="button"
                    disabled={rewardBalance <= 0}
                    className={
                      rewardEnabled && rewardBalance > 0
                        ? "reward-toggle active"
                        : "reward-toggle"
                    }
                    onClick={() => setRewardEnabled((prev) => !prev)}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="delivery-summary">
                <div className="summary-row">
                  <span>Total MRP</span>

                  <strong>{formatPrice(totalMRP)}</strong>
                </div>

                <div className="summary-row">
                  <span>Discount on MRP</span>

                  <strong className="summary-discount">
                    -{formatPrice(discount)}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Convenience fee
                    <span className="summary-arrow">⌄</span>
                  </span>

                  <strong>
                    ₹49 <del>₹100</del>
                  </strong>
                </div>

                <div className="summary-divider" />

                <div className="summary-total">
                  <span>Total</span>

                  <strong>{formatPrice(total)}</strong>
                </div>

                <div className="summary-saved">
                  You saved <strong>{formatPrice(discount)}</strong> on this
                  order
                </div>

                <button
                  type="button"
                  className="proceed-btn"
                  disabled={creatingOrder}
                  onClick={handleProceed}
                >
                  {creatingOrder ? "Creating Order..." : "Proceed to pay"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <AddressDrawer
        isOpen={addressDrawerOpen}
        onClose={() => setAddressDrawerOpen(false)}
        selectedAddress={selectedAddress}
        onAddressSaved={handleAddressSaved}
      />
    </>
  );
};

export default Delivery;
