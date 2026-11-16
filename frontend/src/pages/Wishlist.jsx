import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiStar, FiHeart, FiShoppingCart, FiTrash2, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/pageSections/Footer/Footer";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  getGuestWishlist,
  getGuestWishlistIds,
  removeFromGuestWishlist,
  saveGuestWishlist,
} from "../utils/guestWishlist";
import { addToGuestCart } from "../utils/guestCart";
import { syncGuestCartAndWishlist } from "../utils/syncGuestData";
import "../styles/Wishlist.css";

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

const formatPrice = (price) => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const getImageUrl = (image) => {
  if (!image) return "https://via.placeholder.com/300x300?text=Decathlon+Product";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  const apiBaseUrl = api.defaults.baseURL || "";
  const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
  if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
  if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
  return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
};

const Wishlist = () => {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState("");

  const fetchWishlist = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const guestItems = getGuestWishlist();
      const needsHydration = guestItems.some(
        (item) => typeof item === "string" || !item.name || !item.price || !item.images || item.images.length === 0
      );

      if (needsHydration && guestItems.length > 0) {
        try {
          setLoading(true);
          const hydratedItems = await Promise.all(
            guestItems.map(async (item) => {
              const id = typeof item === "string" ? item : item._id || item.productId;
              if (item.name && item.price && item.images && item.images.length > 0) {
                return item;
              }
              try {
                const res = await api.get(`/products/${id}`);
                const prod = res.data?.product || res.data;
                return prod && prod._id ? prod : item;
              } catch {
                return item;
              }
            })
          );
          saveGuestWishlist(hydratedItems);
          setWishlistItems(hydratedItems);
        } catch (err) {
          console.error("Error hydrating guest wishlist:", err);
          setWishlistItems(guestItems);
        } finally {
          setLoading(false);
        }
      } else {
        setWishlistItems(guestItems);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const guestWishlist = getGuestWishlistIds();
      if (Array.isArray(guestWishlist) && guestWishlist.length > 0) {
        try {
          await syncGuestCartAndWishlist(token);
        } catch (syncErr) {
          console.error("Wishlist sync error:", syncErr);
        }
      }
      const response = await api.get("/wishlist", getAuthConfig());
      const products = response.data?.wishlist?.products || [];
      setWishlistItems(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error("Fetch Wishlist Error:", error);
      if (error.response?.status === 401) {
        setWishlistItems(getGuestWishlist());
        return;
      }
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
    const handleWishlistUpdated = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setWishlistItems(getGuestWishlist());
      } else {
        fetchWishlist();
      }
    };
    window.addEventListener("wishlistUpdated", handleWishlistUpdated);
    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdated);
    };
  }, [fetchWishlist]);

  const handleRemoveFromWishlist = async (productId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      removeFromGuestWishlist(productId);
      setWishlistItems(getGuestWishlist());
      toast.success("Item removed from wishlist");
      window.dispatchEvent(new Event("wishlistUpdated"));
      return;
    }

    try {
      const response = await api.delete(`/wishlist/${productId}`, getAuthConfig());
      const updatedProducts = response.data?.wishlist?.products || [];
      setWishlistItems(Array.isArray(updatedProducts) ? updatedProducts : []);
      toast.success("Item removed from wishlist");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Remove Wishlist Error:", error);
      toast.error(error.response?.data?.message || "Failed to remove item");
    }
  };

  const handleClearWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      saveGuestWishlist([]);
      setWishlistItems([]);
      toast.success("Wishlist cleared");
      window.dispatchEvent(new Event("wishlistUpdated"));
      return;
    }
    try {
      await Promise.all(
        wishlistItems.map((item) =>
          api.delete(`/wishlist/${item._id || item.id}`, getAuthConfig())
        )
      );
      setWishlistItems([]);
      toast.success("Wishlist cleared");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (err) {
      console.error("Clear wishlist error:", err);
      toast.error("Failed to clear wishlist");
    }
  };

  const handleAddToCart = async (product) => {
    const productId = product._id || product.id;
    const token = localStorage.getItem("token");
    if (!token) {
      const res = addToGuestCart(product, product.size?.[0] || "", "", 1);
      if (res.success) {
        toast.success(`${product.name || "Product"} added to cart!`);
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        toast.error(res.message);
      }
      return;
    }

    try {
      setAddingToCartId(productId);
      await api.post(
        "/cart",
        {
          productId,
          quantity: 1,
          size: product.size?.[0] || product.size || "",
        },
        getAuthConfig()
      );
      toast.success(`${product.name || "Product"} added to cart!`);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Add to Cart Error:", error);
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCartId("");
    }
  };

  return (
    <div className="wishlist-page">
      <Navbar />

      <main className="wishlist-main">
        <div className="wishlist-container">
          <div className="wishlist-header">
            <div className="wishlist-header-left">
              <h1 className="wishlist-title">Wishlist</h1>
              <span className="wishlist-count-badge">
                {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"}
              </span>
            </div>

            {wishlistItems.length > 0 && (
              <div className="wishlist-header-actions">
                <button
                  type="button"
                  className="wishlist-clear-all-btn"
                  onClick={handleClearWishlist}
                  title="Clear all wishlist items"
                >
                  <FiTrash2 />
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <LoadingSpinner message="Loading your wishlist..." minHeight="45vh" size="large" />
          ) : wishlistItems.length > 0 ? (
            <div className="wishlist-grid">
              {wishlistItems.map((product) => {
                const productId = product._id || product.id;
                const currentPrice = Number(product.discountPrice || product.price || 0);
                const originalPrice = Number(product.price || 0);
                const hasDiscount = originalPrice > currentPrice && currentPrice > 0;
                const discountPercent = hasDiscount
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0;

                const brand = (product?.brand || "DECATHLON").trim();
                let displayName = (product?.name || "Decathlon Product").trim();
                if (displayName.toLowerCase().startsWith(brand.toLowerCase())) {
                  displayName = displayName
                    .substring(brand.length)
                    .trim()
                    .replace(/^[-:\s]+/, "");
                }

                const ratingCount = product.reviewCount || product.ratingCount || "26.0k";

                return (
                  <div key={productId} className="wishlist-card">
                    <div
                      className="wishlist-image-wrapper"
                      onClick={() => navigate(`/product/${productId}`)}
                      title={`View ${product.name}`}
                    >
                      {product.appliedOffer ? (
                        <span className="wishlist-badge-tag offer">
                          {product.appliedOffer.badgeLabel || "Deal"}
                        </span>
                      ) : product.tag ? (
                        <span className="wishlist-badge-tag">{product.tag}</span>
                      ) : (
                        <span className="wishlist-badge-tag">Online exclusive</span>
                      )}

                      <button
                        type="button"
                        className="wishlist-remove-btn"
                        title="Remove from wishlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWishlist(productId);
                        }}
                      >
                        <FiX />
                      </button>

                      <img
                        src={getImageUrl(product.images?.[0])}
                        alt={product.name}
                        className="wishlist-card-img"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300x300?text=Decathlon+Product";
                        }}
                      />
                    </div>

                    <div className="wishlist-card-details">
                      <div
                        className="wishlist-product-title"
                        onClick={() => navigate(`/product/${productId}`)}
                        title={product.name}
                      >
                        <strong>{brand}</strong> {displayName}
                      </div>

                      <div className="wishlist-rating-row">
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <FiStar key={s} className="star-icon filled" />
                          ))}
                        </div>
                        <span className="rating-count">{ratingCount}</span>
                      </div>

                      <div className="wishlist-price-row">
                        <strong className="current-price">{formatPrice(currentPrice)}</strong>
                        {hasDiscount && (
                          <>
                            <span className="mrp-price">MRP {formatPrice(originalPrice)}</span>
                            <span className="wishlist-discount-pill">{discountPercent}% OFF</span>
                          </>
                        )}
                      </div>

                      {product.appliedOffer?.bannerText && (
                        <div className="wishlist-offer-tag">
                          {product.appliedOffer.bannerText}
                        </div>
                      )}

                      <div className="wishlist-card-action">
                        <button
                          type="button"
                          className="wishlist-add-cart-btn"
                          disabled={addingToCartId === productId}
                          onClick={() => handleAddToCart(product)}
                        >
                          <FiShoppingCart />
                          <span>
                            {addingToCartId === productId ? "Adding..." : "Add to Cart"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="wishlist-empty">
              <div className="empty-heart-icon">
                <FiHeart />
              </div>
              <h2>Your Wishlist is Empty</h2>
              <p>Explore our wide range of sporting equipment and save your favorites here!</p>
              <button
                type="button"
                className="btn-wishlist-shop"
                onClick={() => navigate("/")}
              >
                <FiArrowLeft />
                <span>Start Shopping</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wishlist;
