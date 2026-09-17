import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiMapPin,
  FiTrash2,
  FiHeart,
  FiTag,
  FiAward,
  FiChevronRight,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import CartProductSection from "../components/cart/CartProductSection";
import CartSizeModal from "../components/CartSizeModal";
import AddressDrawer from "../components/AddressDrawer";
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
  const [products, setProducts] = useState([]);
  const [homepageSections, setHomepageSections] = useState([]);
  const [couponBanner, setCouponBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingProduct, setUpdatingProduct] = useState("");
  const [removingProduct, setRemovingProduct] = useState("");
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [updatingSize, setUpdatingSize] = useState(false);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

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
    try {
      const response = await api.get("/cart", getAuthConfig());
      const items = response.data.cart?.items || [];
      setCartItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Fetch Cart Error:", error);
      setCartItems([]);
      if (error.response?.status === 401) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load cart");
    }
  }, [navigate]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get("/products");
      const data = response.data.products || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Products Error:", error);
      setProducts([]);
    }
  }, []);

  const fetchHomepageSections = useCallback(async () => {
    try {
      const response = await api.get("/homepage-sections/active");
      const data = response.data.sections || [];
      setHomepageSections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Homepage Sections Error:", error);
      setHomepageSections([]);
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
        toast.error("Please login first");
        navigate("/login");
      }
    }
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchCart(),
          fetchProducts(),
          fetchHomepageSections(),
          fetchCouponBanner(),
          fetchAddresses(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [
    fetchCart,
    fetchProducts,
    fetchHomepageSections,
    fetchCouponBanner,
    fetchAddresses,
  ]);

  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCart();
    };
    window.addEventListener("cartUpdated", handleCartUpdated);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, [fetchCart]);

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

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  const increaseQuantity = async (item) => {
    const productId = getProductId(item);
    if (!productId) {
      toast.error("Product not found");
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
      toast.warning("Quantity cannot be less than 1");
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

  const removeItem = async (item) => {
    const productId = getProductId(item);
    if (!productId) {
      toast.error("Product not found");
      return;
    }
    try {
      setRemovingProduct(productId);
      const size = item?.size || "";
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
      toast.info("Cart is already empty");
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

  const addToCart = async (product, size = "", quantity = 1) => {
    if (!product?._id) {
      toast.error("Product not found");
      return false;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return false;
    }
    if (Array.isArray(product.size) && product.size.length > 0 && !size) {
      toast.warning("Please select a size");
      return false;
    }
    if (!quantity || Number(quantity) < 1) {
      toast.warning("Quantity must be at least 1");
      return false;
    }
    try {
      const response = await api.post(
        "/cart",
        {
          productId: product._id,
          quantity: Number(quantity),
          size,
        },
        getAuthConfig(),
      );
      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));
      await fetchCart();
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login first");
        navigate("/login");
        return false;
      }
      toast.error(error.response?.data?.message || "Failed to add product");
      return false;
    }
  };

  const openSizeModal = (item) => {
    const product = getProduct(item);
    if (!Array.isArray(product.size) || product.size.length === 0) {
      toast.info("This product has no size options");
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
      toast.warning("Please select a size");
      return;
    }
    const productId = getProductId(selectedCartItem);
    if (!productId) {
      toast.error("Product not found");
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

  const boughtTogetherSection = useMemo(() => {
    const section = homepageSections.find(
      (item) => item.name?.trim().toLowerCase() === "bought together",
    );
    if (!section) return null;

    const selectedProducts =
      section.products || section.productIds || section.items || [];

    const finalProducts = selectedProducts
      .map((selectedProduct) => {
        if (selectedProduct && typeof selectedProduct === "object") {
          return selectedProduct;
        }
        const selectedId = selectedProduct?.toString();
        return products.find(
          (product) => product?._id?.toString() === selectedId,
        );
      })
      .filter(Boolean);

    if (!finalProducts.length) return null;

    return {
      ...section,
      products: finalProducts,
    };
  }, [homepageSections, products]);

  const openAddressDrawer = () => {
    setAddressDrawerOpen(true);
  };

  const handleAddressSaved = async (address) => {
    setSelectedAddress(address);
    setAddressDrawerOpen(false);
    await fetchAddresses();
  };

  const handleDeliveryOption = () => {
    if (!selectedAddress) {
      setAddressDrawerOpen(true);
      return;
    }

    navigate("/checkout/cart/delivery");
  };
  if (loading) {
    return (
      <main className="cart-page">
        <div className="cart-loading">Loading cart...</div>
      </main>
    );
  }

  return (
    <>
      <main className="cart-page">
        <header className="cart-header">
          <button
            type="button"
            className="cart-back"
            onClick={() => navigate("/")}
          >
            <FiArrowLeft />
            <span>Back to Shop</span>
          </button>
          <Link to="/" className="cart-logo">
            <span className="cart-logo-mark">D</span>
            <span>DECATHLON</span>
          </Link>
        </header>

        <div className="cart-progress">
          <span className="cart-progress-active"></span>
          <span></span>
          <span></span>
        </div>

        <div className="cart-main">
          <section className="cart-left">
            <div className="cart-title-row">
              <h1>Cart Items</h1>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                  title="Clear cart"
                >
                  <FiTrash2 />
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
                    {selectedAddress.pincode && `, ${selectedAddress.pincode}`}
                  </div>
                </div>
              ) : (
                <div className="cart-address-text">
                  <span>Delivery to </span>
                  <strong>Add delivery address</strong>
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
                          <strong>{product?.brand || "DECATHLON"}</strong>
                          <p>{product?.name}</p>
                        </div>

                        {item?.size && (
                          <button
                            type="button"
                            className="cart-selected-size"
                            onClick={() => openSizeModal(item)}
                          >
                            <span>Size</span>
                            <strong>{item.size}</strong>
                          </button>
                        )}

                        <div className="cart-options">
                          <span>Qty</span>
                          <div className="quantity-box">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item)}
                              disabled={updatingProduct === productId}
                            >
                              <FiMinus />
                            </button>
                            <span>{quantity}</span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(item)}
                              disabled={updatingProduct === productId}
                            >
                              <FiPlus />
                            </button>
                          </div>
                        </div>

                        <div className="cart-item-price">
                          <strong>{formatPrice(sellingPrice)}</strong>
                          {mrp > sellingPrice && (
                            <span className="cart-item-old-price">
                              MRP {formatPrice(mrp)}
                            </span>
                          )}
                        </div>

                        <div className="cart-item-actions">
                          <button
                            type="button"
                            onClick={() => toast.info("Wishlist coming soon")}
                          >
                            <FiHeart />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            disabled={removingProduct === productId}
                          >
                            <FiTrash2 />
                          </button>
                        </div>

                        <div className="cart-delivery">
                          <span></span>
                          Delivery by <strong>02nd Sep 2026</strong>
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
              <button
                type="button"
                className="cart-side-card"
                onClick={() => toast.info("Coupon selection coming soon")}
              >
                <div className="cart-side-icon">
                  <FiTag />
                </div>
                <span>Apply Coupon</span>
                <FiChevronRight />
              </button>

              <div className="cart-rewards-card">
                <div className="cart-rewards-top">
                  <div className="cart-side-icon">
                    <FiAward />
                  </div>
                  <div>
                    <strong>Sporty Rewards:</strong>
                    <b>₹0</b>
                  </div>
                  <button
                    type="button"
                    className={
                      rewardEnabled ? "reward-toggle active" : "reward-toggle"
                    }
                    onClick={() => setRewardEnabled((prev) => !prev)}
                  >
                    <span></span>
                  </button>
                </div>
                <p>Available Balance: ₹0</p>
              </div>

              <div className="cart-summary">
                <h2>Order Summary</h2>

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

                <small>Convenience fee will be calculated on next step</small>
                <div className="summary-divider"></div>

                <div className="summary-total">
                  <span>Total</span>
                  <strong>{formatPrice(totalAmount)}</strong>
                </div>

                {totalSavings > 0 && (
                  <div className="summary-saved">
                    You saved <strong>{formatPrice(totalSavings)}</strong> on
                    this order
                  </div>
                )}

                <button
                  type="button"
                  className="checkout-btn"
                  disabled={!cartItems.length}
                  onClick={handleDeliveryOption}
                >
                  {selectedAddress
                    ? "Select delivery Option"
                    : "Add or choose address"}
                </button>
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

        {boughtTogetherSection && (
          <CartProductSection
            section={boughtTogetherSection}
            onAddToCart={addToCart}
            getImageUrl={getImageUrl}
            formatPrice={formatPrice}
            getSellingPrice={getSellingPrice}
          />
        )}

        <footer className="cart-footer">
          <Link to="/" className="cart-footer-logo">
            <span>D</span>
            <strong>DECATHLON</strong>
          </Link>

          <div className="cart-footer-links">
            <a href="#terms">Terms of use</a>
            <a href="#supply">Terms of supply</a>
            <a href="#privacy">Privacy policy</a>
          </div>

          <span className="cart-footer-copy">©2026 Decathlon</span>
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
    </>
  );
};

export default Cart;
