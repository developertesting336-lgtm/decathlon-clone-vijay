import {
  getGuestCart,
  updateGuestCartQuantity,
  updateGuestCartSize,
  removeFromGuestCart,
  clearGuestCart as clearStorageGuestCart,
} from "../utils/guestCart";
import { toggleGuestWishlist } from "../utils/guestWishlist";
import { syncGuestCartAndWishlist } from "../utils/syncGuestData";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiMapPin,
  FiTrash2,
  FiHeart,
  FiTag,
  FiAward,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiMinus,
  FiCheck,
  FiTruck,
  FiShield,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import DecathlonLogo from "../components/DecathlonLogo";
import CartSizeModal from "../components/CartSizeModal";
import AddressDrawer from "../components/AddressDrawer";
import ApplyCoupon from "../components/ApplyCoupon/ApplyCoupon";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/Cart.css";

const getProduct = (item) => item?.product || {};
const getProductId = (item) => getProduct(item)?._id?.toString();
const getQuantity = (item) => Number(item?.quantity || 1);
const getSellingPrice = (item) => {
  const product = getProduct(item);
  return Number(product.discountPrice || product.price || 0);
};
const getMRP = (item) => Number(getProduct(item).price || 0);

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [couponBanner, setCouponBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingProduct, setUpdatingProduct] = useState("");
  const [removingProduct, setRemovingProduct] = useState("");
  const rewardEnabled = false;
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [updatingSize, setUpdatingSize] = useState(false);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
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

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCartItems(getGuestCart());
      return;
    }
    try {
      const response = await api.get("/cart", getAuthConfig());
      const items = response.data.cart?.items || [];
      setCartItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Fetch Cart Error:", error);
      setCartItems([]);
      if (error.response?.status === 401) {
        setCartItems(getGuestCart());
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load cart");
    }
  }, []);



  const fetchCouponBanner = useCallback(async () => {
    try {
      const response = await api.get("/banners/active/coupon");
      setCouponBanner(response.data.banner || null);
    } catch (error) {
      console.error("Coupon Banner Error:", error);
      setCouponBanner(null);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await api.get("/addresses", getAuthConfig());
      const addresses = response.data.addresses || [];
      if (!Array.isArray(addresses) || addresses.length === 0) {
        setSelectedAddress(null);
        return;
      }
      const defaultAddress = addresses.find(
        (address) => address.isDefault === true,
      );
      setSelectedAddress(defaultAddress || addresses[0]);
    } catch (error) {
      console.error("Fetch Address Error:", error);
      if (error.response?.status === 401) {
        toast.error("Please login first", { id: "login-required" });
        navigate("/login", { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (token) {
          const guestItems = getGuestCart();
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            try {
              await syncGuestCartAndWishlist(token);
            } catch (syncErr) {
              console.error("Cart sync error:", syncErr);
            }
          }
          await Promise.all([
            fetchCart(),
            fetchCouponBanner(),
            fetchAddresses(),
          ]);
        } else {
          setCartItems(getGuestCart());
          await fetchCouponBanner();
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const handleCartUpdated = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setCartItems(getGuestCart());
      } else {
        const guestItems = getGuestCart();
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          try {
            await syncGuestCartAndWishlist(token);
          } catch (syncErr) {
            console.error("Cart sync error:", syncErr);
          }
        }
        fetchCart();
      }
    };
    window.addEventListener("cartUpdated", handleCartUpdated);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, [
    fetchCart,
    fetchCouponBanner,
    fetchAddresses,
  ]);

  const totalMRP = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + getMRP(item) * getQuantity(item),
      0,
    );
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + getSellingPrice(item) * getQuantity(item),
      0,
    );
  }, [cartItems]);

  const totalSavings = totalMRP - totalAmount;

  const couponDiscount = appliedCoupon
    ? Number(appliedCoupon.discount || 0)
    : 0;
  const finalPayable = appliedCoupon
    ? Number(appliedCoupon.finalAmount || 0)
    : totalAmount;
  const totalSavedOverall = totalSavings + couponDiscount;

  const activeCouponCode = appliedCoupon?.couponCode;

  // Auto-revalidate or remove coupon if cart total or items change
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
          }
        }
      };

      revalidate();
      return () => {
        isCancelled = true;
      };
    }
  }, [totalAmount, cartItems.length, activeCouponCode]);

  const handleCouponApplied = (couponData) => {
    setAppliedCoupon(couponData);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success("Coupon removed");
  };

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  const increaseQuantity = async (item) => {
    const productId = getProductId(item);
    if (!productId) {
      toast.error("Product not found");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      updateGuestCartQuantity(productId, item?.size || "", getQuantity(item) + 1);
      setCartItems(getGuestCart());
      return;
    }
    try {
      setUpdatingProduct(productId);
      await api.put(
        `/cart/${productId}`,
        {
          quantity: getQuantity(item) + 1,
          size: item?.size || "",
        },
        getAuthConfig(),
      );
      await fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update quantity");
    } finally {
      setUpdatingProduct("");
    }
  };

  const decreaseQuantity = async (item) => {
    const productId = getProductId(item);
    const quantity = getQuantity(item);
    if (!productId) {
      toast.error("Product not found");
      return;
    }
    if (quantity <= 1) {
      toast.error("Quantity cannot be less than 1");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      updateGuestCartQuantity(productId, item?.size || "", quantity - 1);
      setCartItems(getGuestCart());
      return;
    }
    try {
      setUpdatingProduct(productId);
      await api.put(
        `/cart/${productId}`,
        {
          quantity: quantity - 1,
          size: item?.size || "",
        },
        getAuthConfig(),
      );
      await fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update quantity");
    } finally {
      setUpdatingProduct("");
    }
  };

  const saveToWishlist = async (item) => {
    const productId = getProductId(item);
    if (!productId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      toggleGuestWishlist(item.product || { _id: productId });
      toast.success("Saved to wishlist ❤️");
      return;
    }
    try {
      await api.post("/wishlist", { productId }, getAuthConfig());
      toast.success("Saved to wishlist");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save to wishlist");
    }
  };

  const removeItem = async (item) => {
    const productId = getProductId(item);
    if (!productId) {
      toast.error("Product not found");
      return;
    }
    const size = item?.size || "";
    const token = localStorage.getItem("token");
    if (!token) {
      removeFromGuestCart(productId, size);
      setCartItems(getGuestCart());
      toast.success("Product removed from cart");
      return;
    }
    try {
      setRemovingProduct(productId);
      await api.delete(
        `/cart/${productId}?size=${encodeURIComponent(size)}`,
        getAuthConfig(),
      );
      setCartItems((prev) =>
        prev.filter(
          (cartItem) =>
            !(
              getProductId(cartItem) === productId &&
              (cartItem?.size || "") === size
            ),
        ),
      );
      toast.success("Product removed from cart");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove product");
    } finally {
      setRemovingProduct("");
    }
  };

  const clearCart = async () => {
    if (!cartItems.length) {
      toast("Cart is already empty");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      clearStorageGuestCart();
      setCartItems([]);
      toast.success("Cart cleared successfully");
      return;
    }
    try {
      setLoading(true);
      for (const item of cartItems) {
        const productId = getProductId(item);
        if (!productId) continue;
        const size = item?.size || "";
        await api.delete(
          `/cart/${productId}?size=${encodeURIComponent(size)}`,
          getAuthConfig(),
        );
      }
      setCartItems([]);
      toast.success("Cart cleared successfully");
    } catch (error) {
      await fetchCart();
      toast.error(error.response?.data?.message || "Failed to clear cart");
    } finally {
      setLoading(false);
    }
  };


  const openSizeModal = (item) => {
    const product = getProduct(item);
    if (!Array.isArray(product.size) || product.size.length === 0) {
      toast("This product has no size options");
      return;
    }
    setSelectedCartItem(item);
    setSelectedSize(item?.size || "");
  };

  const closeSizeModal = () => {
    if (updatingSize) return;
    setSelectedCartItem(null);
    setSelectedSize("");
  };

  const updateSize = async () => {
    if (!selectedCartItem) {
      toast.error("Cart item not found");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    const productId = getProductId(selectedCartItem);
    if (!productId) {
      toast.error("Product not found");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      updateGuestCartSize(productId, selectedCartItem?.size || "", selectedSize);
      setCartItems(getGuestCart());
      toast.success("Size updated successfully");
      closeSizeModal();
      return;
    }
    try {
      setUpdatingSize(true);
      await api.put(
        `/cart/${productId}`,
        {
          quantity: getQuantity(selectedCartItem),
          size: selectedSize,
        },
        getAuthConfig(),
      );
      toast.success("Size updated successfully");
      await fetchCart();
      closeSizeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update size");
    } finally {
      setUpdatingSize(false);
    }
  };


  const openAddressDrawer = () => {
    setAddressDrawerOpen(true);
  };

  const handleAddressSaved = async (address) => {
    setSelectedAddress(address);
    setAddressDrawerOpen(false);
    await fetchAddresses();
  };

  const handleDeliveryOption = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast("Please login or register to complete your order", { icon: "🔒" });
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    if (!selectedAddress) {
      setAddressDrawerOpen(true);
      return;
    }

    navigate("/checkout/cart/delivery", {
      state: {
        appliedCoupon,
        originalCartTotal: totalAmount,
        finalAmount: finalPayable,
        couponDiscount: couponDiscount,
        couponCode: appliedCoupon?.couponCode || "",
      },
    });
  };
  if (loading) {
    return (
      <main className="cart-page">
        <LoadingSpinner message="Loading your cart..." minHeight="60vh" size="large" />
      </main>
    );
  }

  return (
    <>
      <main className="cart-page">
        <header className="cart-header">
          <div className="cart-header-inner">
            <button
              type="button"
              className="cart-back"
              onClick={() => navigate("/")}
            >
              <FiArrowLeft />
              <span>Continue Shopping</span>
            </button>
            <Link to="/" className="cart-logo" title="Decathlon">
              <DecathlonLogo height={24} />
            </Link>
            <div className="cart-header-secure">
              <FiShield />
              <span>100% SECURE CHECKOUT</span>
            </div>
          </div>
        </header>

        <div className="cart-steps-container">
          <div className="cart-step active">
            <span className="step-num">1</span>
            <span className="step-label">Cart</span>
          </div>
          <div className="step-line active"></div>
          <div className="cart-step">
            <span className="step-num">2</span>
            <span className="step-label">Delivery</span>
          </div>
          <div className="step-line"></div>
          <div className="cart-step">
            <span className="step-num">3</span>
            <span className="step-label">Payment</span>
          </div>
        </div>

        <div className="cart-main">
          <section className="cart-left">
            <div className="cart-title-row">
              <div className="cart-title-left">
                <h1>Cart Items</h1>
                <span className="cart-item-count-badge">
                  {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                </span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                  title="Clear all items"
                >
                  <FiTrash2 />
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            <div className="cart-address">
              <div className="cart-address-icon">
                <FiMapPin />
              </div>

              {selectedAddress ? (
                <div className="cart-address-text">
                  <div className="cart-address-title">
                    <span>Delivery to </span>
                    <strong>{selectedAddress.addressType || "Home"}</strong>
                  </div>
                  <div className="cart-address-details">
                    {selectedAddress.houseBuilding}
                    {selectedAddress.streetLocality &&
                      `, ${selectedAddress.streetLocality}`}
                    {selectedAddress.landmark &&
                      `, ${selectedAddress.landmark}`}
                    {selectedAddress.cityState &&
                      `, ${selectedAddress.cityState}`}
                    {selectedAddress.pincode && ` - ${selectedAddress.pincode}`}
                  </div>
                </div>
              ) : (
                <div className="cart-address-text">
                  <span>Delivery to </span>
                  <strong>Add delivery address</strong>
                  <div className="cart-address-details">
                    Select an address to see accurate delivery speed & charges
                  </div>
                </div>
              )}

              <button
                type="button"
                className="cart-address-btn"
                onClick={openAddressDrawer}
              >
                {selectedAddress ? "Change" : "Add address"}
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <h2>Your cart is empty</h2>
                <p>Add products to continue shopping.</p>
                <button type="button" onClick={() => navigate("/")}>
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="cart-items">
                {cartItems.map((item) => {
                  const product = getProduct(item);
                  const productId = getProductId(item);
                  const image = product?.images?.[0] || "";
                  const quantity = getQuantity(item);
                  const sellingPrice = getSellingPrice(item);
                  const mrp = getMRP(item);

                  const brand = (product?.brand || "DECATHLON").trim();
                  let displayName = (product?.name || "Decathlon Product").trim();
                  if (displayName.toLowerCase().startsWith(brand.toLowerCase())) {
                    displayName = displayName.substring(brand.length).trim().replace(/^[-:\s]+/, "");
                  }

                  return (
                    <article
                      className="cart-item"
                      key={`${productId}-${item?.size || "no-size"}`}
                    >
                      <div className="cart-item-image">
                        {image ? (
                          <img
                            src={getImageUrl(image)}
                            alt={product?.name || "Product"}
                          />
                        ) : (
                          <div>No Image</div>
                        )}
                      </div>

                      <div className="cart-item-details">
                        <div className="cart-item-heading">
                          <span className="cart-item-brand">{brand}</span>
                          <h3 className="cart-item-name">{displayName || product?.name}</h3>
                        </div>

                        <div className="cart-item-controls-row">
                          {item?.size && (
                            <button
                              type="button"
                              className="cart-selected-size"
                              onClick={() => openSizeModal(item)}
                              title="Change Size"
                            >
                              <span className="size-label">Size</span>
                              <strong className="size-val">{item.size}</strong>
                              <FiChevronDown className="size-arrow" />
                            </button>
                          )}

                          <div className="cart-options">
                            <span className="qty-label">Qty</span>
                            <div className="quantity-box">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item)}
                                disabled={updatingProduct === productId}
                                title="Decrease quantity"
                              >
                                <FiMinus />
                              </button>
                              <span>{quantity}</span>
                              <button
                                type="button"
                                onClick={() => increaseQuantity(item)}
                                disabled={updatingProduct === productId}
                                title="Increase quantity"
                              >
                                <FiPlus />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="cart-item-price-row">
                          <div className="cart-item-price">
                            <strong className="selling-price">{formatPrice(sellingPrice)}</strong>
                            {mrp > sellingPrice && (
                              <>
                                <span className="cart-item-old-price">
                                  MRP {formatPrice(mrp)}
                                </span>
                                <span className="cart-item-discount-tag">
                                  {Math.round(((mrp - sellingPrice) / mrp) * 100)}% OFF
                                </span>
                              </>
                            )}
                            {product?.appliedOffer && (
                              <span className="cart-item-offer-pill">
                                {product.appliedOffer.badgeLabel || "Deal"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="cart-item-actions-row">
                          <button
                            type="button"
                            className="cart-action-link"
                            onClick={() => saveToWishlist(item)}
                            title="Save to Wishlist"
                          >
                            <FiHeart />
                            <span>Save for later</span>
                          </button>
                          <span className="action-sep">•</span>
                          <button
                            type="button"
                            className="cart-action-link delete"
                            onClick={() => removeItem(item)}
                            disabled={removingProduct === productId}
                            title="Remove from Cart"
                          >
                            <FiTrash2 />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="cart-delivery">
                          <FiTruck className="delivery-truck-icon" />
                          <span>Delivery by <strong>{new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="cart-right">
            <div className="cart-right-sticky">
              {appliedCoupon ? (
                <div className="cart-applied-coupon-card">
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
                    onClick={handleRemoveCoupon}
                    title="Remove coupon"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="cart-side-card"
                  onClick={() => {
                    if (!cartItems.length) {
                      toast("Add items to your cart before applying a coupon");
                      return;
                    }
                    setCouponModalOpen(true);
                  }}
                >
                  <div className="cart-side-icon">
                    <FiTag />
                  </div>
                  <div className="cart-side-card-content">
                    <span className="side-card-title">Apply Coupon</span>
                    <span className="side-card-sub">Save more with discount codes</span>
                  </div>
                  <FiChevronRight className="side-card-chevron" />
                </button>
              )}

              <div className="cart-rewards-card">
                <div className="cart-rewards-top">
                  <div className="cart-side-icon">
                    <FiAward />
                  </div>
                  <div className="cart-rewards-info">
                    <div className="rewards-title-row">
                      <strong>Sporty Rewards</strong>
                      <span className="rewards-pts-badge">0 pts</span>
                    </div>
                    <span className="rewards-bal">Available Balance: ₹0</span>
                  </div>
                  <button
                    type="button"
                    className={`reward-toggle ${rewardEnabled ? "active" : ""}`}
                    disabled={true}
                    onClick={() => {
                      toast("You currently have 0 Sporty Reward points", { icon: "ℹ️" });
                    }}
                    title="Sporty Rewards (0 available)"
                  >
                    <span className="reward-toggle-thumb"></span>
                  </button>
                </div>
              </div>

              <div className="cart-summary">
                <div className="cart-summary-header">
                  <h2>Order Summary</h2>
                  <span className="summary-item-badge">
                    {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="summary-row">
                  <span>Total MRP</span>
                  <strong>{formatPrice(totalMRP)}</strong>
                </div>

                {totalSavings > 0 && (
                  <div className="summary-row summary-saving">
                    <span>Discount on MRP</span>
                    <strong>-{formatPrice(totalSavings)}</strong>
                  </div>
                )}

                {appliedCoupon && couponDiscount > 0 && (
                  <div className="summary-row summary-saving summary-coupon-row">
                    <span>Coupon Discount</span>
                    <strong>-{formatPrice(couponDiscount)}</strong>
                  </div>
                )}

                <div className="summary-row summary-shipping">
                  <span>Convenience Fee</span>
                  <strong className="free-shipping">FREE</strong>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-total">
                  <span>Total Payable</span>
                  <strong>{formatPrice(finalPayable)}</strong>
                </div>

                {totalSavedOverall > 0 && (
                  <div className="summary-saved">
                    🎉 You saved <strong>{formatPrice(totalSavedOverall)}</strong> on this order!
                  </div>
                )}

                <button
                  type="button"
                  className="checkout-btn"
                  disabled={!cartItems.length}
                  onClick={handleDeliveryOption}
                >
                  {selectedAddress
                    ? "SELECT DELIVERY OPTION"
                    : "ADD OR CHOOSE ADDRESS"}
                </button>

                <div className="cart-secure-notice">
                  <FiShield />
                  <span>Safe and Secure Payments • Easy Returns</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {couponBanner?.image && (
          <section className="cart-banner">
            <img
              src={getImageUrl(couponBanner.image)}
              alt={couponBanner.title || "Coupon Banner"}
              className="cart-banner-image"
            />
          </section>
        )}

        <footer className="cart-footer">
          <Link to="/" className="cart-footer-logo" title="Decathlon">
            <DecathlonLogo height={20} />
          </Link>

          <div className="cart-footer-links">
            <a href="#terms">Terms of Use</a>
            <a href="#supply">Terms of Supply</a>
            <a href="#privacy">Privacy Policy</a>
          </div>

          <span className="cart-footer-copy">© 2026 Decathlon. All rights reserved.</span>
        </footer>
      </main>

      {selectedCartItem && (
        <CartSizeModal
          item={selectedCartItem}
          product={getProduct(selectedCartItem)}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          onClose={closeSizeModal}
          onUpdate={updateSize}
          updating={updatingSize}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
          getSellingPrice={getSellingPrice}
        />
      )}

      <AddressDrawer
        isOpen={addressDrawerOpen}
        onClose={() => setAddressDrawerOpen(false)}
        onAddressSaved={handleAddressSaved}
      />

      <ApplyCoupon
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        cartTotal={totalAmount}
        appliedCoupon={appliedCoupon}
        onCouponApplied={handleCouponApplied}
        onRemoveCoupon={handleRemoveCoupon}
      />
    </>
  );
};

export default Cart;

