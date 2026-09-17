import React, { useCallback, useEffect, useState } from "react";
import { FiX, FiStar, FiHeart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api/axios";
import Navbar from "../components/Navbar";
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
  if (!image) return "https://via.placeholder.com/300x375?text=Decathlon+Product";
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
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/wishlist", getAuthConfig());
      const products = response.data?.wishlist?.products || [];
      setWishlistItems(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error("Fetch Wishlist Error:", error);
      if (error.response?.status === 401) {
        toast.error("Please login first to view your wishlist");
        navigate("/login");
        return;
      }
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemoveFromWishlist = async (productId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    try {
      const response = await api.delete(`/wishlist/${productId}`, getAuthConfig());
      const updatedProducts = response.data?.wishlist?.products || [];
      setWishlistItems(Array.isArray(updatedProducts) ? updatedProducts : []);
      toast.success("Item removed from wishlist");
    } catch (error) {
      console.error("Remove Wishlist Error:", error);
      toast.error(error.response?.data?.message || "Failed to remove item");
    }
  };

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first to add items to cart");
      navigate("/login");
      return;
    }

    try {
      setAddingToCartId(product._id);
      await api.post(
        "/cart",
        {
          productId: product._id,
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
            <h1 className="wishlist-title">Wishlist</h1>
            <span className="wishlist-count">
              {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          {loading ? (
            <div className="wishlist-loading-spinner">Loading wishlist...</div>
          ) : wishlistItems.length > 0 ? (
            <div className="wishlist-grid">
              {wishlistItems.map((product) => {
                const currentPrice = product.discountPrice || product.price;
                const hasDiscount =
                  product.discountPrice && product.discountPrice < product.price;

                return (
                  <div key={product._id} className="wishlist-card">
                    <div className="wishlist-image-wrapper">
                      {product.tag ? (
                        <span className="wishlist-badge-tag">{product.tag}</span>
                      ) : (
                        <span className="wishlist-badge-tag">Online exclusive</span>
                      )}

                      <button
                        type="button"
                        className="wishlist-remove-btn"
                        title="Remove from wishlist"
                        onClick={() => handleRemoveFromWishlist(product._id)}
                      >
                        <FiX />
                      </button>

                      <img
                        src={getImageUrl(product.images?.[0])}
                        alt={product.name}
                        className="wishlist-card-img"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300x375?text=Decathlon+Product";
                        }}
                      />
                    </div>

                    <div className="wishlist-card-details">
                      <div className="wishlist-product-title">
                        <strong>{product.brand || "DOMYOS"}</strong> {product.name}
                      </div>

                      <div className="wishlist-rating-row">
                        <div className="stars">
                          <FiStar className="star-icon filled" />
                          <FiStar className="star-icon filled" />
                          <FiStar className="star-icon filled" />
                          <FiStar className="star-icon filled" />
                          <FiStar className="star-icon filled" />
                        </div>
                        <span className="rating-count">
                          {product.ratingCount || "26.0k"}
                        </span>
                      </div>

                      <div className="wishlist-price-row">
                        <span className="current-price">
                          {formatPrice(currentPrice)}
                        </span>
                        {hasDiscount && (
                          <span className="mrp-price">
                            MRP {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      {product.offerText ? (
                        <div className="wishlist-offer-tag">
                          {product.offerText}
                        </div>
                      ) : (
                        <div className="wishlist-offer-tag">
                          Buy 3 @ 2847 and Save 150
                        </div>
                      )}

                      <div className="wishlist-card-action">
                        <button
                          type="button"
                          className="wishlist-add-cart-btn"
                          disabled={addingToCartId === product._id}
                          onClick={() => handleAddToCart(product)}
                        >
                          {addingToCartId === product._id ? "Adding..." : "Add to cart"}
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
              <p>Explore our wide range of products and save your favorites here!</p>
              <button
                type="button"
                className="btn-wishlist-shop"
                onClick={() => navigate("/")}
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </main>

      {/* DECATHLON BLUE FOOTER */}
      <footer className="decathlon-footer">
        <div className="footer-top-banner">
          <div className="banner-item">
            <span className="banner-icon">↻</span>
            <span>Easy Returns*</span>
          </div>
          <div className="banner-item">
            <span className="banner-icon">📦</span>
            <span>Collect in-store</span>
          </div>
          <div className="banner-item">
            <span className="banner-icon">⚡</span>
            <span>Express Delivery*</span>
          </div>
          <div className="banner-item">
            <span className="banner-icon">☺</span>
            <span>1 Mn+ happy customers</span>
          </div>
          <div className="banner-item">
            <span className="banner-icon">↩</span>
            <span>We buy back</span>
          </div>
        </div>

        <div className="footer-main-content">
          <div className="footer-grid">
            <div className="footer-col app-col">
              <h3>Download the app</h3>
              <h3>Become a member</h3>

              <div className="social-icons">
                <a href="#facebook" aria-label="Facebook">
                  <i className="social-icon">f</i>
                </a>
                <a href="#twitter" aria-label="X">
                  <i className="social-icon">X</i>
                </a>
                <a href="#youtube" aria-label="Youtube">
                  <i className="social-icon">▶</i>
                </a>
                <a href="#instagram" aria-label="Instagram">
                  <i className="social-icon">📷</i>
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>SERVICES</h4>
              <ul>
                <li><a href="#services">Decathlon for Schools</a></li>
                <li><a href="#services">Decathlon for Corporates</a></li>
                <li><a href="#services">Decathlon for Sport Clubs</a></li>
                <li><a href="#services">Giftcard</a></li>
                <li><a href="#services">Affiliate Program</a></li>
                <li><a href="#services">Playo Summer</a></li>
                <li><a href="#services">Second life</a></li>
                <li><a href="#services">Buy back</a></li>
                <li><a href="#services">Installation &amp; assembly</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>HELP</h4>
              <ul>
                <li><a href="#help">Find a store</a></li>
                <li><a href="#help">Return Policy</a></li>
                <li><a href="#help">Shipping policy</a></li>
                <li><a href="#help">Sitemap</a></li>
                <li><a href="#help">Product recall</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>ABOUT</h4>
              <ul>
                <li><a href="#about">About us</a></li>
                <li><a href="#about">Made In India</a></li>
                <li><a href="#about">Social &amp; CSR Initiatives</a></li>
                <li><a href="#about">Careers</a></li>
                <li><a href="#about">Blog</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-logo-row">
              <span className="footer-logo-text">
                <span className="logo-symbol">D</span> DECATHLON
              </span>

              <div className="footer-legal-links">
                <a href="#terms">Terms and Conditions</a>
                <a href="#privacy">Privacy Policy</a>
              </div>
            </div>

            <div className="footer-country">
              <span>🇮🇳 India ∨</span>
              <span className="copyright-text">
                © 2026 Decathlon Sports India Pvt Ltd. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Wishlist;
